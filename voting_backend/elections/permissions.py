from rest_framework.permissions import BasePermission


class IsAdminUser(BasePermission):
    """Allow access only to users with ADMIN role."""

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == 'ADMIN'
        )


class IsAdminOrReadOnly(BasePermission):
    """Allow read access to all authenticated users, write access to admins only."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return request.user.role == 'ADMIN'
