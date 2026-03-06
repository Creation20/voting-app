from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Election, Candidate, Vote


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'role', 'is_staff']
    fieldsets = UserAdmin.fieldsets + (
        ('Role', {'fields': ('role',)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Role', {'fields': ('role',)}),
    )


@admin.register(Election)
class ElectionAdmin(admin.ModelAdmin):
    list_display = ['title', 'is_active', 'start_time', 'end_time']
    list_editable = ['is_active']


@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = ['name', 'party', 'election']
    list_filter = ['election']


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ['user', 'candidate', 'election', 'created_at']
    list_filter = ['election']
    readonly_fields = ['user', 'candidate', 'election', 'created_at']
