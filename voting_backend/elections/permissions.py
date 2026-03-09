from rest_framework.permissions import BasePermission


class IsAdminUser(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and
            request.user.role in ('ADMIN', 'ORG_OWNER', 'SUPERUSER')
        )


class IsOrgOwner(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and
            request.user.role in ('ORG_OWNER', 'SUPERUSER')
        )


class IsSuperUser(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and
            request.user.role == 'SUPERUSER'
        )


class BelongsToOrg(BasePermission):
    """User must belong to the same org as the resource."""
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and
            request.user.organization_id is not None
        )