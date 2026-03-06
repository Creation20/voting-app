from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status
from .models import CustomUser, Election, Candidate, Vote


def make_election(is_active=True, offset_hours=1):
    now = timezone.now()
    return Election.objects.create(
        title='Test Election',
        description='Test',
        start_time=now - timedelta(hours=offset_hours),
        end_time=now + timedelta(hours=offset_hours),
        is_active=is_active
    )


class AuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(username='voter1', password='pass1234', email='v@v.com')

    def test_login_success(self):
        res = self.client.post('/api/auth/login/', {'username': 'voter1', 'password': 'pass1234'})
        self.assertEqual(res.status_code, 200)
        self.assertIn('access', res.data)
        self.assertIn('role', res.data)

    def test_login_failure(self):
        res = self.client.post('/api/auth/login/', {'username': 'voter1', 'password': 'wrong'})
        self.assertEqual(res.status_code, 401)


class VotingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(username='voter1', password='pass1234', email='v@v.com')
        self.admin = CustomUser.objects.create_user(
            username='admin1', password='pass1234', email='a@a.com', role='ADMIN'
        )
        self.election = make_election()
        self.candidate = Candidate.objects.create(
            election=self.election, name='Alice', party='Party A'
        )

    def _login(self, user):
        res = self.client.post('/api/auth/login/', {'username': user.username, 'password': 'pass1234'})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    def test_unauthenticated_cannot_vote(self):
        res = self.client.post(f'/api/elections/{self.election.id}/vote/', {'candidate_id': self.candidate.id})
        self.assertEqual(res.status_code, 401)

    def test_user_can_vote_once(self):
        self._login(self.user)
        res = self.client.post(f'/api/elections/{self.election.id}/vote/', {'candidate_id': self.candidate.id})
        self.assertEqual(res.status_code, 201)

    def test_user_cannot_vote_twice(self):
        self._login(self.user)
        self.client.post(f'/api/elections/{self.election.id}/vote/', {'candidate_id': self.candidate.id})
        res = self.client.post(f'/api/elections/{self.election.id}/vote/', {'candidate_id': self.candidate.id})
        self.assertEqual(res.status_code, 409)

    def test_non_admin_cannot_access_results(self):
        self._login(self.user)
        res = self.client.get(f'/api/admin/elections/{self.election.id}/results/')
        self.assertEqual(res.status_code, 403)

    def test_admin_can_access_results(self):
        self._login(self.admin)
        res = self.client.get(f'/api/admin/elections/{self.election.id}/results/')
        self.assertEqual(res.status_code, 200)

    def test_inactive_election_cannot_receive_vote(self):
        self._login(self.user)
        self.election.is_active = False
        self.election.save()
        res = self.client.post(f'/api/elections/{self.election.id}/vote/', {'candidate_id': self.candidate.id})
        self.assertEqual(res.status_code, 400)

    def test_results_show_vote_counts(self):
        Vote.objects.create(user=self.user, candidate=self.candidate, election=self.election)
        self._login(self.admin)
        res = self.client.get(f'/api/admin/elections/{self.election.id}/results/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['total_votes'], 1)
        self.assertEqual(res.data['results'][0]['vote_count'], 1)
