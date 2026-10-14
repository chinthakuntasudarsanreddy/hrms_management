import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth import get_user_model
from employees.models import Employee

User = get_user_model()

unlinked = Employee.objects.filter(user__isnull=True)

for employee in unlinked:
    user = User.objects.filter(email__iexact=employee.email).first()

    if user is None:
        print(f"No login account found: {employee.email}")
    elif Employee.objects.filter(user=user).exists():
        print(f"Account already linked: {user.email}")
    else:
        employee.user = user
        employee.save(update_fields=["user"])
        print(f"Linked {user.email} to {employee.employee_code}")

print("Employee linking process completed.")
