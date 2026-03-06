from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import CustomUser, Election, Candidate, Vote
from django.utils import timezone
import datetime


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['username'] = user.username
        token['email'] = user.email
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['role'] = self.user.role
        data['username'] = self.user.username
        data['email'] = self.user.email
        return data


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'role']


class CandidateSerializer(serializers.ModelSerializer):
    vote_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Candidate
        fields = ['id', 'name', 'description', 'party', 'motto', 'election', 'vote_count', 'created_at']
        read_only_fields = ['created_at']


class FlexibleDateTimeField(serializers.DateTimeField):
    def to_internal_value(self, value):
        for fmt in [
            '%Y-%m-%dT%H:%M',
            '%Y-%m-%dT%H:%M:%S',
            '%Y-%m-%dT%H:%M:%SZ',
            '%Y-%m-%dT%H:%M:%S.%f',
        ]:
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

    class Meta:
        model = Election
        fields = ['id', 'title', 'description', 'start_time', 'end_time', 'is_active', 'candidates', 'created_at']
        read_only_fields = ['created_at']


class VoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vote
        fields = ['id', 'candidate', 'election', 'created_at']
        read_only_fields = ['created_at']

    def validate(self, data):
        user = self.context['request'].user
        election = data['election']
        candidate = data['candidate']

        if not election.is_active:
            raise serializers.ValidationError("This election is not currently active.")
        if candidate.election != election:
            raise serializers.ValidationError("This candidate does not belong to the specified election.")
        if Vote.objects.filter(user=user, election=election).exists():
            raise serializers.ValidationError("You have already voted in this election.")

        return data

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class VoteSubmitSerializer(serializers.Serializer):
    candidate_id = serializers.IntegerField()