from django.contrib.auth.models import AbstractUser
from django.db import models
import secrets
import string


def generate_join_code():
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(8))


class Organization(models.Model):
    class OrgType(models.TextChoices):
        UNIVERSITY = 'UNIVERSITY', 'University'
        HIGH_SCHOOL = 'HIGH_SCHOOL', 'High School'
        GOVERNMENT = 'GOVERNMENT', 'Government'
        CORPORATE = 'CORPORATE', 'Corporate'
        COMMUNITY = 'COMMUNITY', 'Community'
        OTHER = 'OTHER', 'Other'

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=100, unique=True)
    org_type = models.CharField(max_length=20, choices=OrgType.choices, default=OrgType.OTHER)
    description = models.TextField(blank=True)
    join_code = models.CharField(max_length=8, unique=True, default=generate_join_code)
    logo_url = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.get_org_type_display()})"

    def regenerate_join_code(self):
        self.join_code = generate_join_code()
        self.save()


class CustomUser(AbstractUser):
    class Role(models.TextChoices):
        USER = 'USER', 'Voter'
        ADMIN = 'ADMIN', 'Admin'
        ORG_OWNER = 'ORG_OWNER', 'Organization Owner'
        SUPERUSER = 'SUPERUSER', 'Superuser'

    role = models.CharField(max_length=10, choices=Role.choices, default=Role.USER)
    email = models.EmailField(unique=True)
    organization = models.ForeignKey(
        'Organization', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='members'
    )
    # Voter-specific fields
    voter_id = models.CharField(max_length=100, blank=True, help_text='Institutional ID / reference number')
    full_name = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"{self.username} ({self.role})"

    @property
    def is_admin_user(self):
        return self.role in (self.Role.ADMIN, self.Role.ORG_OWNER, self.Role.SUPERUSER)

    @property
    def is_super_user_role(self):
        return self.role == self.Role.SUPERUSER

    @property
    def is_org_owner(self):
        return self.role == self.Role.ORG_OWNER


class Election(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        ACTIVE = 'ACTIVE', 'Active'
        PAUSED = 'PAUSED', 'Paused'
        ENDED = 'ENDED', 'Ended'

    organization = models.ForeignKey(
        Organization, null=True, blank=True,
        on_delete=models.CASCADE, related_name='elections'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    is_active = models.BooleanField(default=False)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.organization.name if self.organization else 'No Org'})"

    def save(self, *args, **kwargs):
        # Keep is_active in sync with status for backwards compat
        self.is_active = self.status == self.Status.ACTIVE
        super().save(*args, **kwargs)


class Candidate(models.Model):
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name='candidates')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    party = models.CharField(max_length=255, blank=True)
    motto = models.CharField(max_length=500, blank=True)
    position = models.CharField(max_length=255, blank=True, help_text='e.g. President, Secretary')
    photo_url = models.URLField(blank=True)
    manifesto = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.election.title})"


class Vote(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='votes')
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='votes')
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name='votes')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'election')

    def __str__(self):
        return f"{self.user.username} voted in {self.election.title}"


class AuditLog(models.Model):
    class Action(models.TextChoices):
        LOGIN = 'LOGIN', 'Login'
        LOGOUT = 'LOGOUT', 'Logout'
        VOTE_CAST = 'VOTE_CAST', 'Vote Cast'
        ELECTION_CREATED = 'ELECTION_CREATED', 'Election Created'
        ELECTION_UPDATED = 'ELECTION_UPDATED', 'Election Updated'
        ELECTION_DELETED = 'ELECTION_DELETED', 'Election Deleted'
        CANDIDATE_ADDED = 'CANDIDATE_ADDED', 'Candidate Added'
        CANDIDATE_UPDATED = 'CANDIDATE_UPDATED', 'Candidate Updated'
        CANDIDATE_DELETED = 'CANDIDATE_DELETED', 'Candidate Deleted'
        VOTER_UPLOADED = 'VOTER_UPLOADED', 'Voters Uploaded (CSV)'
        MEMBER_ROLE_CHANGED = 'MEMBER_ROLE_CHANGED', 'Member Role Changed'
        MEMBER_REMOVED = 'MEMBER_REMOVED', 'Member Removed'
        JOIN_CODE_REGENERATED = 'JOIN_CODE_REGENERATED', 'Join Code Regenerated'
        ORG_SETTINGS_UPDATED = 'ORG_SETTINGS_UPDATED', 'Org Settings Updated'
        LOGIN_FAILED = 'LOGIN_FAILED', 'Login Failed'

    user = models.ForeignKey(
        CustomUser, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='audit_logs'
    )
    organization = models.ForeignKey(
        Organization, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='audit_logs'
    )
    action = models.CharField(max_length=30, choices=Action.choices)
    detail = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.action} by {self.user} at {self.created_at}"


class VoterUpload(models.Model):
    """Tracks CSV bulk voter uploads."""
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='voter_uploads')
    uploaded_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)
    filename = models.CharField(max_length=255)
    total_rows = models.IntegerField(default=0)
    success_count = models.IntegerField(default=0)
    error_count = models.IntegerField(default=0)
    errors = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Upload {self.filename} by {self.uploaded_by} ({self.success_count}/{self.total_rows})"