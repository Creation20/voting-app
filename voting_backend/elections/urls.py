from django.urls import path
from . import views

urlpatterns = [
    path('me/', views.MeView.as_view(), name='me'),
    path('elections/', views.ElectionListView.as_view(), name='election-list'),
    path('elections/active/', views.ActiveElectionView.as_view(), name='active-election'),
    path('elections/<int:election_id>/candidates/', views.ElectionCandidatesView.as_view(), name='election-candidates'),
    path('elections/<int:election_id>/vote/', views.VoteView.as_view(), name='cast-vote'),
    # Admin endpoints
    path('admin/elections/', views.AdminElectionListCreateView.as_view(), name='admin-elections'),
    path('admin/elections/<int:election_id>/', views.AdminElectionDetailView.as_view(), name='admin-election-detail'),
    path('admin/elections/<int:election_id>/results/', views.AdminElectionResultsView.as_view(), name='admin-results'),
    path('admin/candidates/', views.AdminCandidateListCreateView.as_view(), name='admin-candidates'),
]