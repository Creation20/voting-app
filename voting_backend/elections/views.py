from django.db import IntegrityError
from django.db.models import Count
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Election, Candidate, Vote
from .permissions import IsAdminUser, IsSuperUser
from .serializers import (
    CustomTokenObtainPairSerializer,
    ElectionSerializer,
    CandidateSerializer,
    VoteSubmitSerializer,
    UserSerializer,
)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class ElectionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        elections = Election.objects.all().order_by('-is_active', '-start_time')
        return Response(ElectionSerializer(elections, many=True).data)


class ActiveElectionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        election = Election.objects.filter(
            is_active=True, start_time__lte=now, end_time__gte=now
        ).first()
        if not election:
            return Response({'detail': 'No active election found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ElectionSerializer(election).data)


class ElectionCandidatesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, election_id):
        try:
            election = Election.objects.get(pk=election_id)
        except Election.DoesNotExist:
            return Response({'detail': 'Election not found.'}, status=status.HTTP_404_NOT_FOUND)

        candidates = Candidate.objects.filter(election=election)
        user_vote = Vote.objects.filter(user=request.user, election=election).first()

        return Response({
            'candidates': CandidateSerializer(candidates, many=True).data,
            'voted_candidate_id': user_vote.candidate_id if user_vote else None,
        })


class VoteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, election_id):
        serializer = VoteSubmitSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        candidate_id = serializer.validated_data['candidate_id']

        try:
            election = Election.objects.get(pk=election_id)
        except Election.DoesNotExist:
            return Response({'detail': 'Election not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not election.is_active:
            return Response({'detail': 'This election is not currently active.'}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        if not (election.start_time <= now <= election.end_time):
            return Response({'detail': 'This election is not within its voting window.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            candidate = Candidate.objects.get(pk=candidate_id, election=election)
        except Candidate.DoesNotExist:
            return Response({'detail': 'Candidate not found in this election.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            vote = Vote.objects.create(user=request.user, candidate=candidate, election=election)
        except IntegrityError:
            return Response({'detail': 'You have already voted in this election.'}, status=status.HTTP_409_CONFLICT)

        return Response({
            'detail': 'Vote cast successfully.',
            'vote_id': vote.id,
            'candidate': CandidateSerializer(candidate).data,
        }, status=status.HTTP_201_CREATED)


# ── Admin views ────────────────────────────────────────────────────────────────

class AdminElectionListCreateView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        elections = Election.objects.all().order_by('-created_at')
        return Response(ElectionSerializer(elections, many=True).data)

    def post(self, request):
        serializer = ElectionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminElectionDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get_object(self, election_id):
        try:
            return Election.objects.get(pk=election_id)
        except Election.DoesNotExist:
            return None

    def get(self, request, election_id):
        election = self.get_object(election_id)
        if not election:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ElectionSerializer(election).data)

    def patch(self, request, election_id):
        election = self.get_object(election_id)
        if not election:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ElectionSerializer(election, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminCandidateListCreateView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = CandidateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminElectionResultsView(APIView):
    """Admin results — NO percentages, just counts."""
    permission_classes = [IsAdminUser]

    def get(self, request, election_id):
        try:
            election = Election.objects.get(pk=election_id)
        except Election.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        candidates = Candidate.objects.filter(election=election).annotate(
            vote_count=Count('votes')
        ).order_by('-vote_count')

        total_votes = Vote.objects.filter(election=election).count()

        results = [
            {
                'id': c.id,
                'name': c.name,
                'party': c.party,
                'description': c.description,
                'vote_count': c.vote_count,
                # No percentage here — superuser only
            }
            for c in candidates
        ]

        return Response({
            'election': ElectionSerializer(election).data,
            'total_votes': total_votes,
            'results': results,
        })


# ── Superuser-only views ───────────────────────────────────────────────────────

def _build_results_with_percentage(election):
    """Helper: build results with vote counts AND percentages."""
    candidates = Candidate.objects.filter(election=election).annotate(
        vote_count=Count('votes')
    ).order_by('-vote_count')
    total_votes = Vote.objects.filter(election=election).count()
    results = []
    for c in candidates:
        pct = round((c.vote_count / total_votes * 100), 1) if total_votes > 0 else 0
        results.append({
            'id': c.id,
            'name': c.name,
            'party': c.party,
            'motto': c.motto,
            'description': c.description,
            'vote_count': c.vote_count,
            'percentage': pct,
        })
    return total_votes, results


class SuperuserElectionListCreateView(APIView):
    permission_classes = [IsSuperUser]

    def get(self, request):
        elections = Election.objects.all().order_by('-created_at')
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
    """Superuser results — includes percentages."""
    permission_classes = [IsSuperUser]

    def get(self, request, election_id):
        try:
            election = Election.objects.get(pk=election_id)
        except Election.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        total_votes, results = _build_results_with_percentage(election)
        return Response({
            'election': ElectionSerializer(election).data,
            'total_votes': total_votes,
            'results': results,
        })


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