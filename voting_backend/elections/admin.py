from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Organization, Election, Candidate, Vote, AuditLog, VoterUpload


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ['name', 'org_type', 'join_code', 'is_active', 'created_at']
    list_filter = ['org_type', 'is_active']
    search_fields = ['name', 'join_code']
    readonly_fields = ['join_code', 'slug', 'created_at']


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'role', 'organization', 'voter_id', 'is_staff']
    list_filter = ['role', 'organization']
    search_fields = ['username', 'email', 'voter_id', 'full_name']
    fieldsets = UserAdmin.fieldsets + (
        ('Role & Organisation', {'fields': ('role', 'organization', 'voter_id', 'full_name')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Role & Organisation', {'fields': ('role', 'organization', 'voter_id', 'full_name')}),
    )


@admin.register(Election)
class ElectionAdmin(admin.ModelAdmin):
    list_display = ['title', 'organization', 'status', 'is_active', 'start_time', 'end_time']
    list_filter = ['status', 'is_active', 'organization']
    search_fields = ['title']


@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = ['name', 'party', 'position', 'election']
    list_filter = ['election']
    search_fields = ['name', 'party']


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ['user', 'candidate', 'election', 'ip_address', 'created_at']
    list_filter = ['election']
    readonly_fields = ['user', 'candidate', 'election', 'ip_address', 'user_agent', 'created_at']


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['action', 'user', 'organization', 'ip_address', 'created_at']
    list_filter = ['action', 'organization']
    readonly_fields = ['action', 'user', 'organization', 'detail', 'ip_address', 'user_agent', 'created_at']
    search_fields = ['user__username', 'detail']


@admin.register(VoterUpload)
class VoterUploadAdmin(admin.ModelAdmin):
    list_display = ['filename', 'organization', 'uploaded_by', 'total_rows', 'success_count', 'error_count', 'created_at']
    readonly_fields = ['filename', 'organization', 'uploaded_by', 'total_rows', 'success_count', 'error_count', 'errors', 'created_at']