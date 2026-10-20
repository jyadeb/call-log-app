from django.db import models

#inheritance of Django's model
class Firm(models.Model):
    name = models.CharField(max_length=200)
    city = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)

    #defines what an object shows when printed
    def __str__(self):
        return self.name
    

class Call(models.Model):
    class Outcome(models.TextChoices):
        NOT_INTERESTED = "not_interested", "Not Interested"
        BOOKED = "booked", 'Booked'
        CALLBACK = "callback", "Callback"
        WRONG_PERSON = "wrong_person", "Wrong person"
        VOICEMAIL = "voicemail", "Voicemail"
        OTHER = "other", "Other"

    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="calls")
    date = models.DateField
    contact_name = models.CharField(max_length=200, blank=True)
    contact_role = models.CharField(max_length=200, blank=True)
    outcome = models.CharField(max_length=20, choices=Outcome.choices)
    reason = models.TextField(blank=True)
    next_action = models.CharField(max_length=300, blank=True)
    follow_up_date = models.DateField(null=True, blank=True)
    raw_notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.firm} - {self.date} - {self.get_outcome_display()}"

