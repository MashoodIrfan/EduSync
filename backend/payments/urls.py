
from django.urls import path

from .views import JazzCashReturnView


urlpatterns = [
    path(
        "jazzcash/return/",
        JazzCashReturnView.as_view(),
        name="jazzcash-return",
    ),
]

