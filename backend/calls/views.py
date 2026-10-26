"""
Views handles requests and each class answers one kind of request. 
Three decisions: which rows, which serializer, which status code.
"""

from django.utils import timezone
from rest_framework import generics
from .models import Firm, Call
from .serializers import CallSerializer, FirmSerializer

# the main view at /api/calls/
# GET --> get_queryset picks rows --> serializer writes JSON --> 200
# POST --> serializer validates the JSON body --> row saved --> serializer writes it back --> 201 or 400, nothing saved
class CallListCreate(generics.ListCreateAPIView):
    serializer_class = CallSerializer #tells view which translator to use

    #decides which rows this GET returns. Runs on every request to read the request's filter
    def get_queryset(self):
        queryset = Call.objects.select_related("firm").order_by("-date")
        outcome = self.request.query_params.get("outcome")

        if outcome:
            queryset = queryset.filter(outcome=outcome)

        return queryset
    
# one specific call for /api/calls/<id>/
# GET -> fetch call id -> JSON -> 200 or 404
# PATCH -> validate only the fields sent -> update row -> return updated call -> 200 or 400 on bad value
class CallDetail(generics.RetrieveUpdateAPIView):
    queryset = Call.objects.select_related("firm")
    serializer_class = CallSerializer

# A read-only class that lists contacts that need a follow up at /api/calls/due
# Today's date --> calls with follow_up_date on or before today -> serializer -> JSON list 
class CallsDue(generics.ListAPIView):

    serializer_class = CallSerializer

    #builds the due list fresh for every request
    def get_queryset(self):
        today = timezone.localdate()
        return (
            Call.objects.select_related("firm")
            .filter(follow_up_date__lte=today)
            .order_by("follow_up_date")
        )
    
# Reads one firm plus its full call timeline at /api/firms/<id>/
# firm <id> + its calls (via related_name) -> FirmSerializer nests them -> one JSON object -> 200 or 404 if no such firm
class FirmDetail(generics.RetrieveAPIView):
    queryset = Firm.objects.all()
    serializer_class = FirmSerializer