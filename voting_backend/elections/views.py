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
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class ElectionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        elections = Election.objects.all().order_by('-is_active', '-start_time')
        serializer = ElectionSerializer(elections, many=True)
        return Response(serializer.data)


class ActiveElectionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        election = Election.objects.filter(
            is_active=True,
            start_time__lte=now,
            end_time__gte=now
        ).first()
        if not election:
            return Response({'detail': 'No active election found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ElectionSerializer(election)
        return Response(serializer.data)


class ElectionCandidatesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, election_id):
        try:
            election = Election.objects.get(pk=election_id)
        except Election.DoesNotExist:
            return Response({'detail': 'Election not found.'}, status=status.HTTP_404_NOT_FOUND)

        candidates = Candidate.objects.filter(election=election)
        serializer = CandidateSerializer(candidates, many=True)
        user_vote = Vote.objects.filter(user=request.user, election=election).first()
        voted_candidate_id = user_vote.candidate_id if user_vote else None

        return Response({
            'candidates': serializer.data,
            'voted_candidate_id': voted_candidate_id,
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
        serializer = ElectionSerializer(elections, many=True)
        return Response(serializer.data)

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
            return Response({'detail': 'Election not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ElectionSerializer(election).data)

    def patch(self, request, election_id):
        election = self.get_object(election_id)
        if not election:
            return Response({'detail': 'Election not found.'}, status=status.HTTP_404_NOT_FOUND)
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
    permission_classes = [IsAdminUser]

    def get(self, request, election_id):
        try:
            election = Election.objects.get(pk=election_id)
        except Election.DoesNotExist:
            return Response({'detail': 'Election not found.'}, status=status.HTTP_404_NOT_FOUND)

        candidates = Candidate.objects.filter(election=election).annotate(
            vote_count=Count('votes')
        ).order_by('-vote_count')

        total_votes = Vote.objects.filter(election=election).count()

        results = []
        for candidate in candidates:
            pct = round((candidate.vote_count / total_votes * 100), 1) if total_votes > 0 else 0
            results.append({
                'id': candidate.id,
                'name': candidate.name,
                'party': candidate.party,
                'motto': candidate.motto,
                'description': candidate.description,
                'vote_count': candidate.vote_count,
                'percentage': pct,
            })

        return Response({
            'election': ElectionSerializer(election).data,
            'total_votes': total_votes,
            'results': results,
        })


# ── Superuser-only views ───────────────────────────────────────────────────────

class SuperuserCandidateCreateView(APIView):
    permission_classes = [IsSuperUser]

    def get(self, request):
        """List all candidates across all elections."""
        candidates = Candidate.objects.select_related('election').all().order_by('-created_at')
        serializer = CandidateSerializer(candidates, many=True)
        return Response(serializer.data)

    def post(self, request):
        """Create a candidate with name, party, and motto."""
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
            return Response({'detail': 'Candidate not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CandidateSerializer(candidate, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, candidate_id):
        candidate = self.get_object(candidate_id)
        if not candidate:
            return Response({'detail': 'Candidate not found.'}, status=status.HTTP_404_NOT_FOUND)
        candidate.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)