from django.db import models


class Tenant(models.Model):
    name = models.CharField(max_length=150)
    slug = models.SlugField(unique=True)

    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
