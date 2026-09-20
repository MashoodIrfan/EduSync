from django.core.exceptions import ValidationError
from django.db import models


class AttendanceRecord(models.Model):

    class Status(models.TextChoices):
        PRESENT = "PRESENT", "Present"
        ABSENT = "ABSENT", "Absent"
        LATE = "LATE", "Late"

    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )

    student = models.ForeignKey(
        "academics.Student",
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )

    class_room = models.ForeignKey(
        "academics.Class",
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )

    subject = models.ForeignKey(
        "academics.Subject",
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )

    teacher = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="marked_attendance",
    )

    date = models.DateField()
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=(
                    "student",
                    "class_room",
                    "subject",
                    "date",
                ),
                name="unique_student_subject_attendance_per_day",
            )
        ]

    def clean(self):
        if self.student.tenant_id != self.tenant_id:
            raise ValidationError(
                "Student and attendance must belong to the same school."
            )

        if self.class_room.tenant_id != self.tenant_id:
            raise ValidationError(
                "Class and attendance must belong to the same school."
            )

        if self.subject.tenant_id != self.tenant_id:
            raise ValidationError(
                "Subject and attendance must belong to the same school."
            )

        if self.teacher.tenant_id != self.tenant_id:
            raise ValidationError(
                "Teacher and attendance must belong to the same school."
            )

        if self.student.class_room_id != self.class_room_id:
            raise ValidationError(
                "Student is not enrolled in this class."
            )

        assignment_exists = self.teacher.teaching_assignments.filter(
            class_room=self.class_room,
            subject=self.subject,
            tenant=self.tenant,
        ).exists()

        if not assignment_exists:
            raise ValidationError(
                "Teacher is not assigned to this class and subject."
            )

    def __str__(self):
        return (
            f"{self.student} - "
            f"{self.subject} - "
            f"{self.date} - "
            f"{self.status}"
        )


class AttendanceRemark(models.Model):
    attendance_record = models.ForeignKey(
        AttendanceRecord,
        on_delete=models.CASCADE,
        related_name="remarks",
    )

    teacher = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="attendance_remarks",
    )

    remark = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        if self.teacher_id != self.attendance_record.teacher_id:
            raise ValidationError(
                "Only the teacher who marked attendance can add its remark."
            )

    def __str__(self):
        return f"Remark for {self.attendance_record.student}"