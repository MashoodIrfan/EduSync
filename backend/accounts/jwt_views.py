from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


class EduSyncTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        token["role"] = user.role
        token["tenant_id"] = user.tenant_id
        token["username"] = user.username
        token["first_name"] = user.first_name
        token["last_name"] = user.last_name

        return token


class EduSyncTokenObtainPairView(TokenObtainPairView):
    serializer_class = EduSyncTokenObtainPairSerializer
