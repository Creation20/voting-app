from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('me/', views.MeView.as_view(), name='me'),
    path('org/lookup/<str:join_code>/', views.OrgByJoinCodeView.as_view(), name='org-lookup'),

    # Voter endpoints (scoped to org)
    path('elections/', views.ElectionListView.as_view(), name='election-list'),
    path('elections/<int:election_id>/candidates/', views.ElectionCandidatesView.as_view(), name='election-candidates'),
    path('elections/<int:election_id>/vote/', views.VoteView.as_view(), name='cast-vote'),

    # Admin endpoints (scoped to org)
    path('admin/dashboard/', views.AdminDashboardView.as_view(), name='admin-dashboard'),
    path('admin/elections/', views.AdminElectionListCreateView.as_view(), name='admin-elections'),
    path('admin/elections/<int:election_id>/', views.AdminElectionDetailView.as_view(), name='admin-election-detail'),
    path('admin/elections/<int:election_id>/results/', views.AdminElectionResultsView.as_view(), name='admin-results'),
    path('admin/candidates/', views.AdminCandidateListCreateView.as_view(), name='admin-candidates'),
    path('admin/voters/', views.AdminVoterListView.as_view(), name='admin-voters'),
    path('admin/voters/upload/', views.AdminVoterUploadView.as_view(), name='admin-voter-upload'),
    path('admin/audit-log/', views.AdminAuditLogView.as_view(), name='admin-audit-log'),

    # Org owner endpoints
    path('org/members/', views.OrgMembersView.as_view(), name='org-members'),
    path('org/members/<int:user_id>/', views.OrgMembersView.as_view(), name='org-member-detail'),
    path('org/settings/', views.OrgSettingsView.as_view(), name='org-settings'),
    path('org/regenerate-code/', views.RegenerateJoinCodeView.as_view(), name='regenerate-code'),

    # Superuser endpoints (global)
    path('superuser/dashboard/', views.SuperuserDashboardView.as_view(), name='superuser-dashboard'),
    path('superuser/orgs/', views.SuperuserOrgListCreateView.as_view(), name='superuser-orgs'),
    path('superuser/orgs/<int:org_id>/', views.SuperuserOrgDetailView.as_view(), name='superuser-org-detail'),
    path('superuser/elections/', views.SuperuserElectionListCreateView.as_view(), name='superuser-elections'),
    path('superuser/elections/<int:election_id>/', views.SuperuserElectionDetailView.as_view(), name='superuser-election-detail'),
    path('superuser/elections/<int:election_id>/results/', views.SuperuserElectionResultsView.as_view(), name='superuser-results'),
    path('superuser/candidates/', views.SuperuserCandidateCreateView.as_view(), name='superuser-candidates'),
    path('superuser/candidates/<int:candidate_id>/', views.SuperuserCandidateDetailView.as_view(), name='superuser-candidate-detail'),
    path('superuser/audit-log/', views.SuperuserAuditLogView.as_view(), name='superuser-audit-log'),
]