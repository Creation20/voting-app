from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import CustomUser, Organization, Election, Candidate, CandidateTeamMember, Vote, AuditLog, VoterUpload
from django.utils import timezone
from django.utils.text import slugify
import datetime


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['username'] = user.username
        token['email'] = user.email
        token['org_id'] = user.organization_id
        token['org_name'] = user.organization.name if user.organization else None
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['role'] = self.user.role
        data['username'] = self.user.username
        data['email'] = self.user.email
        data['org_id'] = self.user.organization_id
        data['org_name'] = self.user.organization.name if self.user.organization else None
        return data


class UserSerializer(serializers.ModelSerializer):
    org_name = serializers.CharField(source='organization.name', read_only=True, default=None)

    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'role', 'organization', 'org_name', 'voter_id', 'full_name']


class OrganizationSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()
    election_count = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = ['id', 'name', 'slug', 'org_type', 'description', 'join_code',
                  'logo_url', 'is_active', 'member_count', 'election_count', 'created_at']
        read_only_fields = ['slug', 'join_code', 'created_at']

    def get_member_count(self, obj):
        return obj.members.count()

    def get_election_count(self, obj):
        return obj.elections.count()

    def create(self, validated_data):
        name = validated_data.get('name', '')
        base_slug = slugify(name)
        slug = base_slug
        counter = 1
        while Organization.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        validated_data['slug'] = slug
        return super().create(validated_data)


class CandidateTeamMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = CandidateTeamMember
        fields = ['id', 'name', 'title', 'photo_url', 'order', 'candidate']
        read_only_fields = ['id']


class CandidateSerializer(serializers.ModelSerializer):
    vote_count = serializers.IntegerField(read_only=True, default=0)
    team_members = CandidateTeamMemberSerializer(many=True, read_only=True)

    class Meta:
        model = Candidate
        fields = [
            'id', 'name', 'description', 'party', 'motto',
            'position', 'photo_url', 'manifesto',
            'election', 'vote_count', 'team_members', 'created_at'
        ]
        read_only_fields = ['created_at']


class FlexibleDateTimeField(serializers.DateTimeField):
    def to_internal_value(self, value):
        for fmt in ['%Y-%m-%dT%H:%M', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%dT%H:%M:%SZ', '%Y-%m-%dT%H:%M:%S.%f']:
            try:
                dt = datetime.datetime.strptime(value.rstrip('Z'), fmt.rstrip('Z'))
                return timezone.make_aware(dt, timezone.utc)
            except (ValueError, AttributeError):
                continue
        return super().to_internal_value(value)


class ElectionSerializer(serializers.ModelSerializer):
    candidates = CandidateSerializer(many=True, read_only=True)
    start_time = FlexibleDateTimeField()
    end_time = FlexibleDateTimeField()
    org_name = serializers.CharField(source='organization.name', read_only=True)
    total_votes = serializers.SerializerMethodField()
    voter_count = serializers.SerializerMethodField()

    class Meta:
        model = Election
        fields = [
            'id', 'title', 'description', 'start_time', 'end_time',
            'is_active', 'status', 'candidates', 'organization', 'org_name',
            'total_votes', 'voter_count', 'created_at'
        ]
        read_only_fields = ['created_at', 'org_name', 'is_active']

    def get_total_votes(self, obj):
        return obj.votes.count()

    def get_voter_count(self, obj):
        if obj.organization:
            return obj.organization.members.count()
        return 0


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    join_code = serializers.CharField(max_length=8)

    def validate_username(self, value):
        if CustomUser.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already taken.")
        return value

    def validate_email(self, value):
        if CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already registered.")
        return value

    def validate_join_code(self, value):
        try:
            org = Organization.objects.get(join_code=value.upper(), is_active=True)
            return org
        except Organization.DoesNotExist:
            raise serializers.ValidationError("Invalid or inactive join code.")

    def create(self, validated_data):
        org = validated_data['join_code']  # already resolved to org object
        user = CustomUser.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            organization=org,
            role='USER',
        )
        return user


class VoteSubmitSerializer(serializers.Serializer):
    candidate_id = serializers.IntegerField()


class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True, default=None)

    class Meta:
        model = AuditLog
        fields = ['id', 'action', 'detail', 'username', 'ip_address', 'created_at']


class VoterUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = VoterUpload
        fields = ['id', 'filename', 'total_rows', 'success_count', 'error_count', 'errors', 'created_at']


class BulkVoterCSVSerializer(serializers.Serializer):
    """For parsing a single voter row from CSV."""
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(required=False, default='')
    voter_id = serializers.CharField(max_length=100, required=False, default='')
    full_name = serializers.CharField(max_length=255, required=False, default='')

    def validate_username(self, value):
        return value.strip()

    def validate_email(self, value):
        return value.strip().lower()


class DashboardStatsSerializer(serializers.Serializer):
    total_voters = serializers.IntegerField()
    total_votes = serializers.IntegerField()
    active_elections = serializers.IntegerField()
    total_elections = serializers.IntegerField()
    voter_turnout_pct = serializers.FloatField()
    recent_votes = serializers.IntegerField()