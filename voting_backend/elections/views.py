import csv
import io
import secrets
import string

from django.db import IntegrityError
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Organization, Election, Candidate, CandidateTeamMember, Vote, CustomUser, AuditLog, VoterUpload
from .permissions import IsAdminUser, IsOrgOwner, IsSuperUser, BelongsToOrg
from .serializers import (
    CustomTokenObtainPairSerializer, ElectionSerializer, CandidateSerializer,
    CandidateTeamMemberSerializer, VoteSubmitSerializer, UserSerializer,
    OrganizationSerializer, RegisterSerializer,
    AuditLogSerializer, VoterUploadSerializer,
)


def get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def get_user_agent(request):
    return request.META.get('HTTP_USER_AGENT', '')[:512]


def audit(request, action, detail='', org=None, user=None):
    AuditLog.objects.create(
        user=user or (request.user if request.user.is_authenticated else None),
        organization=org or (request.user.organization if request.user.is_authenticated else None),
        action=action,
        detail=detail,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )


def _build_results_with_percentage(election):
    candidates = Candidate.objects.filter(election=election).annotate(
        vote_count=Count('votes')
    ).order_by('-vote_count')
    total_votes = Vote.objects.filter(election=election).count()
    results = []
    for c in candidates:
        pct = round((c.vote_count / total_votes * 100), 1) if total_votes > 0 else 0
        results.append({
            'id': c.id, 'name': c.name, 'party': c.party,
            'motto': c.motto, 'description': c.description,
            'position': c.position, 'photo_url': c.photo_url,
            'vote_count': c.vote_count, 'percentage': pct,
        })
    return total_votes, results


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            # Successful login audit
            try:
                user = CustomUser.objects.get(username=request.data.get('username', ''))
                audit(request, AuditLog.Action.LOGIN, f"User {user.username} logged in", user=user, org=user.organization)
            except CustomUser.DoesNotExist:
                pass
        else:
            audit(request, AuditLog.Action.LOGIN_FAILED,
                  f"Failed login attempt for username: {request.data.get('username', '')}")
        return response


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            refresh['role'] = user.role
            refresh['username'] = user.username
            refresh['email'] = user.email
            refresh['org_id'] = user.organization_id
            refresh['org_name'] = user.organization.name if user.organization else None
            audit(request, AuditLog.Action.LOGIN,
                  f"New registration: {user.username}", user=user, org=user.organization)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'role': user.role,
                'username': user.username,
                'org_name': user.organization.name if user.organization else None,
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


# ── Org lookup (public) ────────────────────────────────────────────────────────

class OrgByJoinCodeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, join_code):
        try:
            org = Organization.objects.get(join_code=join_code.upper(), is_active=True)
            return Response({
                'id': org.id, 'name': org.name,
                'org_type': org.get_org_type_display(),
                'description': org.description,
            })
        except Organization.DoesNotExist:
            return Response({'detail': 'Invalid join code.'}, status=status.HTTP_404_NOT_FOUND)


# ── Dashboard stats ────────────────────────────────────────────────────────────

class AdminDashboardView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        org = request.user.organization
        total_voters = CustomUser.objects.filter(organization=org).count()
        total_votes = Vote.objects.filter(election__organization=org).count()
        active_elections = Election.objects.filter(organization=org, status='ACTIVE').count()
        total_elections = Election.objects.filter(organization=org).count()

        voter_turnout_pct = 0.0
        if total_voters > 0:
            voters_who_voted = CustomUser.objects.filter(
                organization=org, votes__isnull=False
            ).distinct().count()
            voter_turnout_pct = round(voters_who_voted / total_voters * 100, 1)

        # votes in last 24h
        from datetime import timedelta
        recent_votes = Vote.objects.filter(
            election__organization=org,
            created_at__gte=timezone.now() - timedelta(hours=24)
        ).count()

        return Response({
            'total_voters': total_voters,
            'total_votes': total_votes,
            'active_elections': active_elections,
            'total_elections': total_elections,
            'voter_turnout_pct': voter_turnout_pct,
            'recent_votes': recent_votes,
        })


# ── Elections (scoped to user's org) ──────────────────────────────────────────

class ElectionListView(APIView):
    permission_classes = [IsAuthenticated, BelongsToOrg]

    def get(self, request):
        elections = Election.objects.filter(
            organization=request.user.organization
        ).order_by('-is_active', '-start_time')
        return Response(ElectionSerializer(elections, many=True).data)


class ElectionCandidatesView(APIView):
    permission_classes = [IsAuthenticated, BelongsToOrg]

    def get(self, request, election_id):
        try:
            election = Election.objects.get(pk=election_id, organization=request.user.organization)
        except Election.DoesNotExist:
            return Response({'detail': 'Election not found.'}, status=status.HTTP_404_NOT_FOUND)

        candidates = Candidate.objects.filter(election=election)
        user_vote = Vote.objects.filter(user=request.user, election=election).first()
        return Response({
            'candidates': CandidateSerializer(candidates, many=True).data,
            'voted_candidate_id': user_vote.candidate_id if user_vote else None,
        })


class VoteView(APIView):
    permission_classes = [IsAuthenticated, BelongsToOrg]

    def post(self, request, election_id):
        serializer = VoteSubmitSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            election = Election.objects.get(pk=election_id, organization=request.user.organization)
        except Election.DoesNotExist:
            return Response({'detail': 'Election not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not election.is_active:
            return Response({'detail': 'This election is not active.'}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        if not (election.start_time <= now <= election.end_time):
            return Response({'detail': 'Outside voting window.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            candidate = Candidate.objects.get(pk=serializer.validated_data['candidate_id'], election=election)
        except Candidate.DoesNotExist:
            return Response({'detail': 'Candidate not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            vote = Vote.objects.create(
                user=request.user,
                candidate=candidate,
                election=election,
                ip_address=get_client_ip(request),
                user_agent=get_user_agent(request),
            )
        except IntegrityError:
            return Response({'detail': 'Already voted.'}, status=status.HTTP_409_CONFLICT)

        audit(request, AuditLog.Action.VOTE_CAST,
              f"{request.user.username} voted for {candidate.name} in '{election.title}'")

        return Response({
            'detail': 'Vote cast successfully.',
            'vote_id': vote.id,
            'candidate': CandidateSerializer(candidate).data,
        }, status=status.HTTP_201_CREATED)


# ── Admin (scoped to org) ─────────────────────────────────────────────────────

class AdminElectionListCreateView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        elections = Election.objects.filter(
            organization=request.user.organization
        ).order_by('-created_at')
        return Response(ElectionSerializer(elections, many=True).data)

    def post(self, request):
        data = request.data.copy()
        data['organization'] = request.user.organization_id
        serializer = ElectionSerializer(data=data)
        if serializer.is_valid():
            election = serializer.save()
            audit(request, AuditLog.Action.ELECTION_CREATED, f"Election '{election.title}' created")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminElectionDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get_object(self, election_id, org):
        try:
            return Election.objects.get(pk=election_id, organization=org)
        except Election.DoesNotExist:
            return None

    def patch(self, request, election_id):
        election = self.get_object(election_id, request.user.organization)
        if not election:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ElectionSerializer(election, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            audit(request, AuditLog.Action.ELECTION_UPDATED,
                  f"Election '{election.title}' updated: {list(request.data.keys())}")
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, election_id):
        election = self.get_object(election_id, request.user.organization)
        if not election:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        title = election.title
        election.delete()
        audit(request, AuditLog.Action.ELECTION_DELETED, f"Election '{title}' deleted")
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminCandidateListCreateView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        election_id = request.data.get('election')
        try:
            Election.objects.get(pk=election_id, organization=request.user.organization)
        except Election.DoesNotExist:
            return Response({'detail': 'Election not found in your organization.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CandidateSerializer(data=request.data)
        if serializer.is_valid():
            candidate = serializer.save()
            audit(request, AuditLog.Action.CANDIDATE_ADDED,
                  f"Candidate '{candidate.name}' added to '{candidate.election.title}'")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminElectionResultsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, election_id):
        try:
            election = Election.objects.get(pk=election_id, organization=request.user.organization)
        except Election.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        total_votes, results = _build_results_with_percentage(election)
        return Response({
            'election': ElectionSerializer(election).data,
            'total_votes': total_votes,
            'results': results,
        })


# ── CSV Voter Upload ──────────────────────────────────────────────────────────

class AdminVoterUploadView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        csv_file = request.FILES.get('file')
        if not csv_file:
            return Response({'detail': 'No file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)

        if not csv_file.name.endswith('.csv'):
            return Response({'detail': 'File must be a CSV.'}, status=status.HTTP_400_BAD_REQUEST)

        org = request.user.organization
        decoded = csv_file.read().decode('utf-8-sig')
        reader = csv.DictReader(io.StringIO(decoded))

        required_cols = {'username', 'email', 'password'}
        if not required_cols.issubset(set(reader.fieldnames or [])):
            return Response({
                'detail': f'CSV must contain columns: {", ".join(required_cols)}. '
                          f'Optional: voter_id, full_name'
            }, status=status.HTTP_400_BAD_REQUEST)

        rows = list(reader)
        success_count = 0
        error_count = 0
        errors = []

        for i, row in enumerate(rows, start=2):  # row 1 = header
            username = row.get('username', '').strip()
            email = row.get('email', '').strip().lower()
            password = row.get('password', '').strip()
            voter_id = row.get('voter_id', '').strip()
            full_name = row.get('full_name', '').strip()

            if not username or not email or not password:
                errors.append(f"Row {i}: username, email, password are required.")
                error_count += 1
                continue

            if CustomUser.objects.filter(username=username).exists():
                errors.append(f"Row {i}: Username '{username}' already exists.")
                error_count += 1
                continue

            if CustomUser.objects.filter(email=email).exists():
                errors.append(f"Row {i}: Email '{email}' already registered.")
                error_count += 1
                continue

            try:
                CustomUser.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    organization=org,
                    role='USER',
                    voter_id=voter_id,
                    full_name=full_name,
                )
                success_count += 1
            except Exception as e:
                errors.append(f"Row {i}: {str(e)}")
                error_count += 1

        upload = VoterUpload.objects.create(
            organization=org,
            uploaded_by=request.user,
            filename=csv_file.name,
            total_rows=len(rows),
            success_count=success_count,
            error_count=error_count,
            errors=errors,
        )

        audit(request, AuditLog.Action.VOTER_UPLOADED,
              f"CSV upload: {success_count} voters created, {error_count} errors from '{csv_file.name}'")

        return Response(VoterUploadSerializer(upload).data, status=status.HTTP_201_CREATED)

    def get(self, request):
        """List past uploads for this org."""
        uploads = VoterUpload.objects.filter(organization=request.user.organization).order_by('-created_at')[:20]
        return Response(VoterUploadSerializer(uploads, many=True).data)


# ── Voter Management ──────────────────────────────────────────────────────────

class AdminVoterListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        """List all voters in this org."""
        voters = CustomUser.objects.filter(
            organization=request.user.organization, role='USER'
        ).order_by('username')
        return Response(UserSerializer(voters, many=True).data)


# ── Audit Log ─────────────────────────────────────────────────────────────────

class AdminAuditLogView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        logs = AuditLog.objects.filter(
            organization=request.user.organization
        ).select_related('user').order_by('-created_at')[:200]
        return Response(AuditLogSerializer(logs, many=True).data)


# ── Org Owner ─────────────────────────────────────────────────────────────────

class OrgMembersView(APIView):
    permission_classes = [IsOrgOwner]

    def get(self, request):
        members = CustomUser.objects.filter(organization=request.user.organization)
        return Response(UserSerializer(members, many=True).data)

    def patch(self, request, user_id):
        try:
            member = CustomUser.objects.get(pk=user_id, organization=request.user.organization)
        except CustomUser.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        new_role = request.data.get('role')
        if new_role not in ('USER', 'ADMIN'):
            return Response({'detail': 'Invalid role. Choose USER or ADMIN.'}, status=status.HTTP_400_BAD_REQUEST)
        old_role = member.role
        member.role = new_role
        member.save()
        audit(request, AuditLog.Action.MEMBER_ROLE_CHANGED,
              f"{member.username} role changed {old_role} → {new_role}")
        return Response(UserSerializer(member).data)

    def delete(self, request, user_id):
        try:
            member = CustomUser.objects.get(pk=user_id, organization=request.user.organization)
        except CustomUser.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        if member == request.user:
            return Response({'detail': 'Cannot remove yourself.'}, status=status.HTTP_400_BAD_REQUEST)
        username = member.username
        member.organization = None
        member.role = 'USER'
        member.save()
        audit(request, AuditLog.Action.MEMBER_REMOVED, f"Member '{username}' removed from org")
        return Response(status=status.HTTP_204_NO_CONTENT)


class OrgSettingsView(APIView):
    permission_classes = [IsOrgOwner]

    def get(self, request):
        return Response(OrganizationSerializer(request.user.organization).data)

    def patch(self, request):
        serializer = OrganizationSerializer(request.user.organization, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            audit(request, AuditLog.Action.ORG_SETTINGS_UPDATED, "Organisation settings updated")
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RegenerateJoinCodeView(APIView):
    permission_classes = [IsOrgOwner]

    def post(self, request):
        org = request.user.organization
        org.regenerate_join_code()
        audit(request, AuditLog.Action.JOIN_CODE_REGENERATED, "Join code regenerated")
        return Response({'join_code': org.join_code})


# ── Superuser (global) ────────────────────────────────────────────────────────

class SuperuserOrgListCreateView(APIView):
    permission_classes = [IsSuperUser]

    def get(self, request):
        orgs = Organization.objects.annotate(
            member_count=Count('members', distinct=True),
            election_count=Count('elections', distinct=True),
        ).order_by('-created_at')
        return Response(OrganizationSerializer(orgs, many=True).data)

    def post(self, request):
        serializer = OrganizationSerializer(data=request.data)
        if serializer.is_valid():
            org = serializer.save()
            owner_data = request.data.get('owner')
            if owner_data:
                owner = CustomUser.objects.create_user(
                    username=owner_data['username'],
                    email=owner_data['email'],
                    password=owner_data['password'],
                    organization=org,
                    role='ORG_OWNER',
                )
                return Response({
                    **OrganizationSerializer(org).data,
                    'owner_created': UserSerializer(owner).data,
                }, status=status.HTTP_201_CREATED)
            return Response(OrganizationSerializer(org).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SuperuserOrgDetailView(APIView):
    permission_classes = [IsSuperUser]

    def get_object(self, org_id):
        try:
            return Organization.objects.get(pk=org_id)
        except Organization.DoesNotExist:
            return None

    def get(self, request, org_id):
        org = self.get_object(org_id)
        if not org:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(OrganizationSerializer(org).data)

    def patch(self, request, org_id):
        org = self.get_object(org_id)
        if not org:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = OrganizationSerializer(org, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, org_id):
        org = self.get_object(org_id)
        if not org:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        org.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SuperuserElectionListCreateView(APIView):
    permission_classes = [IsSuperUser]

    def get(self, request):
        elections = Election.objects.select_related('organization').all().order_by('-created_at')
        return Response(ElectionSerializer(elections, many=True).data)

    def post(self, request):
        serializer = ElectionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SuperuserElectionDetailView(APIView):
    permission_classes = [IsSuperUser]

    def get_object(self, election_id):
        try:
            return Election.objects.get(pk=election_id)
        except Election.DoesNotExist:
            return None

    def patch(self, request, election_id):
        election = self.get_object(election_id)
        if not election:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ElectionSerializer(election, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, election_id):
        election = self.get_object(election_id)
        if not election:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        election.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SuperuserElectionResultsView(APIView):
    permission_classes = [IsSuperUser]

    def get(self, request, election_id):
        try:
            election = Election.objects.get(pk=election_id)
        except Election.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        total_votes, results = _build_results_with_percentage(election)
        return Response({'election': ElectionSerializer(election).data, 'total_votes': total_votes, 'results': results})


class SuperuserCandidateCreateView(APIView):
    permission_classes = [IsSuperUser]

    def get(self, request):
        candidates = Candidate.objects.select_related('election').all().order_by('election', 'name')
        return Response(CandidateSerializer(candidates, many=True).data)

    def post(self, request):
        serializer = CandidateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SuperuserCandidateDetailView(APIView):
    permission_classes = [IsSuperUser]

    def get_object(self, pk):
        try:
            return Candidate.objects.get(pk=pk)
        except Candidate.DoesNotExist:
            return None

    def patch(self, request, candidate_id):
        candidate = self.get_object(candidate_id)
        if not candidate:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CandidateSerializer(candidate, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, candidate_id):
        candidate = self.get_object(candidate_id)
        if not candidate:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        candidate.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SuperuserAuditLogView(APIView):
    permission_classes = [IsSuperUser]

    def get(self, request):
        org_id = request.query_params.get('org_id')
        logs = AuditLog.objects.select_related('user', 'organization').order_by('-created_at')
        if org_id:
            logs = logs.filter(organization_id=org_id)
        logs = logs[:500]
        return Response(AuditLogSerializer(logs, many=True).data)


class SuperuserDashboardView(APIView):
    permission_classes = [IsSuperUser]

    def get(self, request):
        total_orgs = Organization.objects.filter(is_active=True).count()
        total_voters = CustomUser.objects.filter(role='USER').count()
        total_votes = Vote.objects.count()
        active_elections = Election.objects.filter(status='ACTIVE').count()
        total_elections = Election.objects.count()
        return Response({
            'total_orgs': total_orgs,
            'total_voters': total_voters,
            'total_votes': total_votes,
            'active_elections': active_elections,
            'total_elections': total_elections,
        })


# ── Candidate Team Members ─────────────────────────────────────────────────────

class AdminTeamMemberListCreateView(APIView):
    """Admin/OrgOwner: list all team members for a candidate, or add one."""
    permission_classes = [IsAdminUser]

    def get(self, request, candidate_id):
        try:
            candidate = Candidate.objects.get(pk=candidate_id, election__organization=request.user.organization)
        except Candidate.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        members = candidate.team_members.all()
        return Response(CandidateTeamMemberSerializer(members, many=True).data)

    def post(self, request, candidate_id):
        try:
            candidate = Candidate.objects.get(pk=candidate_id, election__organization=request.user.organization)
        except Candidate.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        data = {**request.data, 'candidate': candidate.id}
        serializer = CandidateTeamMemberSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            audit(request, AuditLog.Action.CANDIDATE_UPDATED,
                  f"Team member '{serializer.data['name']}' added to candidate '{candidate.name}'")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminTeamMemberDetailView(APIView):
    """Admin/OrgOwner: update or delete a specific team member."""
    permission_classes = [IsAdminUser]

    def _get_member(self, request, member_id):
        try:
            return CandidateTeamMember.objects.get(
                pk=member_id,
                candidate__election__organization=request.user.organization
            )
        except CandidateTeamMember.DoesNotExist:
            return None

    def patch(self, request, member_id):
        member = self._get_member(request, member_id)
        if not member:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CandidateTeamMemberSerializer(member, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, member_id):
        member = self._get_member(request, member_id)
        if not member:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        audit(request, AuditLog.Action.CANDIDATE_UPDATED,
              f"Team member '{member.name}' removed from candidate '{member.candidate.name}'")
        member.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SuperuserTeamMemberListCreateView(APIView):
    """Superuser: manage team members across all orgs."""
    permission_classes = [IsSuperUser]

    def get(self, request, candidate_id):
        try:
            candidate = Candidate.objects.get(pk=candidate_id)
        except Candidate.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(CandidateTeamMemberSerializer(candidate.team_members.all(), many=True).data)

    def post(self, request, candidate_id):
        try:
            candidate = Candidate.objects.get(pk=candidate_id)
        except Candidate.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        data = {**request.data, 'candidate': candidate.id}
        serializer = CandidateTeamMemberSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SuperuserTeamMemberDetailView(APIView):
    permission_classes = [IsSuperUser]

    def patch(self, request, member_id):
        try:
            member = CandidateTeamMember.objects.get(pk=member_id)
        except CandidateTeamMember.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CandidateTeamMemberSerializer(member, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, member_id):
        try:
            member = CandidateTeamMember.objects.get(pk=member_id)
        except CandidateTeamMember.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        member.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)