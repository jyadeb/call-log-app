"""
Translates between the database and JSON
Out: Call/Firm row --> JSON in the response
In: JSON from the client --> checked by these classes --> view saves it
"""


#imports DRF toolkit of serializer classes and model classes from models.py
from rest_framework import serializers
from .models import Firm, Call

#translates 1 Call row, in both directions
#In: POST/PATCH JSON --> checks firm, outcome, date --> clean data to the view
#Out: saved or fetched Call row --> JSON dict in the response
class CallSerializer(serializers.ModelSerializer):
    # follows the foreign key and outputs the firm's name as text 
    firm_name = serializers.CharField(source="firm.name", read_only=True) #follows foreign key and returns firm name, only reading

    #inner class for serializer's settings for translating call rows
    class Meta:
        model = Call
        fields = [
            "id", "firm", "firm_name", "date", "contact_name", "contact_role", "outcome", "reason", "next_action", "follow_up_date", "raw_notes",
        ]

#The translator for one Firm, including its call history. 
#Out: Firm row + its Call rows --> one JSON object with a "calls" list
class FirmSerializer(serializers.ModelSerializer):

    #nested serializer to put the firm's calls into CallSerializer, putting results in a list
    calls = CallSerializer(many=True, read_only=True) 

#serializer settings for translating Firm rows
    class Meta:
        model = Firm
        fields = ["id", "name", "city", "notes", "calls"]


# the gate at the front of /parse/
class ParseInputSerializer(serializers.Serializer):
    notes = serializers.CharField(max_length=4000)

# PreviewSerializer checks the AI's dict in Python.
# Although the schema already forces the shape, this enforces the rules again so a change in model or API can't slip a bad vaue through
# Every field is required but may be null --> "the notes didn't say"
class PreviewSerializer(serializers.Serializer):
    firm_name = serializers.CharField(allow_null=True)
    contact_name = serializers.CharField(allow_null=True, max_length=200)
    contact_role = serializers.CharField(allow_null=True, max_length=200)
    next_action  = serializers.CharField(allow_null=True, max_length=300)
    outcome = serializers.ChoiceField(choices=Call.Outcome.choices)
    reason = serializers.CharField(allow_null=True)
    follow_up_date = serializers.DateField(allow_null=True)

