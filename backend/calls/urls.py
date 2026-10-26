"""
The routing table where each URL path is mapped to the view that handles it. 
"""

from django.urls import path
from . import views

urlpatterns = [
    path("calls/", views.CallListCreate.as_view()), #list or create calls
    path("calls/due/", views.CallsDue.as_view()), #the follow-up list
    path("calls/parse/", views.ParseCall.as_view()), # parse call
    path("calls/<int:pk>/", views.CallDetail.as_view()), #one call with <int:pk> caputing the call_id/pk
    path("firms/<int:pk>/", views.FirmDetail.as_view()), #one firm with its call timeline using the same pk mechanism

]