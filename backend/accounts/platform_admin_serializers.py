from django.contrib.auth.password_validation import validate_password
from django.utils.crypto import get_random_string
from django.utils.text import slugify

from rest_framework import serializers

from tenants.models import Tenant

from .models import User


class PlatformAdminTenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = (
            "id",
            "name",
            "slug",
            "email",
            "phone",
            "address",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")
        extra_kwargs = {"slug": {"required": False}}

    def create(self, validated_data):
        if not validated_data.get("slug"):
            validated_data["slug"] = slugify(
                validated_data["name"]
            )
        else:
            validated_data["slug"] = slugify(
                validated_data["slug"]
            )

        tenant = Tenant(**validated_data)
        tenant.full_clean()
        tenant.save()

        return tenant

    def update(self, instance, validated_data):
        if "slug" in validated_data:
            validated_data["slug"] = slugify(
                validated_data["slug"]
            )

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.full_clean()
        instance.save()

        return instance


class PlatformAdminSchoolAdminSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=False,
        validators=[validate_password],
    )
    temporary_password = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "password",
            "is_active",
            "date_joined",
            "temporary_password",
        )
        read_only_fields = ("id", "date_joined")

    def get_temporary_password(self, obj):
        return getattr(obj, "_temporary_password", None)

    def validate_username(self, value):
        if (
            self.instance is None
            and User.objects.filter(username=value).exists()
        ):
            raise serializers.ValidationError(
                "This username is already taken."
            )

        return value

    def create(self, validated_data):
        tenant = self.context["tenant"]
        password = (
            validated_data.pop("password", None)
            or get_random_string(12)
        )

        # See SchoolAdminTeacherSerializer.create() for why
        # "is_active" must be forced here rather than trusted from
        # validated_data.
        validated_data.pop("is_active", None)

        school_admin = User(
            role=User.Role.SCHOOL_ADMIN,
            tenant=tenant,
            is_active=True,
            **validated_data,
        )
        school_admin.set_password(password)
        school_admin.full_clean(exclude=["password"])
        school_admin.save()

        school_admin._temporary_password = password

        return school_admin

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)

        instance.full_clean(exclude=["password"])
        instance.save()

        return instance
