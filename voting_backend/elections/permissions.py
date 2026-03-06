from rest_framework.permissions import BasePermission


class IsAdminUser(BasePermission):
    """Allow access only to users with ADMIN or SUPERUSER role."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in ('ADMIN', 'SUPERUSER')
        )


class IsSuperUser(BasePermission):
    """Allow access only to users with SUPERUSER role."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == 'SUPERUSER'
        )


class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return request.user.role in ('ADMIN', 'SUPERUSER')