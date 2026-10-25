from django.contrib import admin
from .models import Call, Firm

@admin.register(Firm)
class FirmAdmin(admin.ModelAdmin):
    list_display = ["name", "city"]

@admin.register(Call)
class CallAdmin(admin.ModelAdmin):
    list_display = ["date", "firm", "contact_name", "outcome", "follow_up_date"]
    list_filter = ["outcome", "follow_up_date"]
