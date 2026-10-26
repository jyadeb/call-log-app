"""
Views handles requests and each class answers one kind of request. 
Three decisions: which rows, which serializer, which status code.
"""

from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from . import ai
from .models import Firm, Call
from .serializers import (
    CallSerializer,
    FirmSerializer,
    ParseInputSerializer,
    PreviewSerializer,
)

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

# POST /api/calls/parse/.
# Checks input -> asks AI
# Checks output -> looks up firm -> 200. Never saves anything
class ParseCall(APIView):
    def post(self, request):
        inp = ParseInputSerializer(data=request.data)
        inp.is_valid(raise_exception=True)

        # parsing the notes using ai.py with error catching
        try:
            raw = ai.parse_notes(inp.validated_data["notes"], timezone.localdate())
        except ai.UpstreamError as e:
            return Response({"error": "AI service failed", "detail": str(e)},
                            status=status.HTTP_502_BAD_GATEWAY)
        except ai.BadOutputError as e:
            return Response({"error": "AI output unusable", "detail": str(e)},
                            status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        
        # Uses the preview serializer to check the output
        preview = PreviewSerializer(data=raw)
        if not preview.is_valid():
            return Response({"error": "AI output failed validation", "detail": preview.errors}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

    #confirming firm name to check output
        name = preview.validated_data["firm_name"]
        firm = Firm.objects.filter(name__iexact=name.strip()).first() if name else None
        
        return Response({
            "preview": preview.data,
            "firm_id": firm.id if firm else None,
            "is_new_firm": bool(name) and firm is None,
        })

