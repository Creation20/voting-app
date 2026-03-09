from django.db import IntegrityError
from django.db.models import Count
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Organization, Election, Candidate, Vote, CustomUser
from .permissions import IsAdminUser, IsOrgOwner, IsSuperUser, BelongsToOrg
from .serializers import (
    CustomTokenObtainPairSerializer, ElectionSerializer, CandidateSerializer,
    VoteSubmitSerializer, UserSerializer, OrganizationSerializer, RegisterSerializer,
)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


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
            vote = Vote.objects.create(user=request.user, candidate=candidate, election=election)
        except IntegrityError:
            return Response({'detail': 'Already voted.'}, status=status.HTTP_409_CONFLICT)

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
            serializer.save()
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
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, election_id):
        election = self.get_object(election_id, request.user.organization)
        if not election:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        election.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminCandidateListCreateView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        # Verify election belongs to user's org
        election_id = request.data.get('election')
        try:
            Election.objects.get(pk=election_id, organization=request.user.organization)
        except Election.DoesNotExist:
            return Response({'detail': 'Election not found in your organization.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CandidateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminElectionResultsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, election_id):
        try:
            election = Election.objects.get(pk=election_id, organization=request.user.organization)
        except Election.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        candidates = Candidate.objects.filter(election=election).annotate(
            vote_count=Count('votes')
        ).order_by('-vote_count')
        total_votes = Vote.objects.filter(election=election).count()

        return Response({
            'election': ElectionSerializer(election).data,
            'total_votes': total_votes,
            'results': [
                {'id': c.id, 'name': c.name, 'party': c.party, 'description': c.description, 'vote_count': c.vote_count}
                for c in candidates
            ],
        })


# ── Org Owner ─────────────────────────────────────────────────────────────────

class OrgMembersView(APIView):
    permission_classes = [IsOrgOwner]

    def get(self, request):
        members = CustomUser.objects.filter(organization=request.user.organization)
        return Response(UserSerializer(members, many=True).data)

    def patch(self, request, user_id):
        """Change a member's role."""
        try:
            member = CustomUser.objects.get(pk=user_id, organization=request.user.organization)
        except CustomUser.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        new_role = request.data.get('role')
        if new_role not in ('USER', 'ADMIN'):
            return Response({'detail': 'Invalid role. Choose USER or ADMIN.'}, status=status.HTTP_400_BAD_REQUEST)
        member.role = new_role
        member.save()
        return Response(UserSerializer(member).data)

    def delete(self, request, user_id):
        """Remove a member from the org."""
        try:
            member = CustomUser.objects.get(pk=user_id, organization=request.user.organization)
        except CustomUser.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        if member == request.user:
            return Response({'detail': 'Cannot remove yourself.'}, status=status.HTTP_400_BAD_REQUEST)
        member.organization = None
        member.role = 'USER'
        member.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class OrgSettingsView(APIView):
    permission_classes = [IsOrgOwner]

    def get(self, request):
        return Response(OrganizationSerializer(request.user.organization).data)

    def patch(self, request):
        serializer = OrganizationSerializer(request.user.organization, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RegenerateJoinCodeView(APIView):
    permission_classes = [IsOrgOwner]

    def post(self, request):
        org = request.user.organization
        org.regenerate_join_code()
        return Response({'join_code': org.join_code})


# ── Superuser (global) ────────────────────────────────────────────────────────

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
            'vote_count': c.vote_count, 'percentage': pct,
        })
    return total_votes, results


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
            # Create the org owner account if provided
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