"""Pure data-contract tests: no app, database, or authentication connections."""
import unittest
from datetime import date, datetime, timezone

from pydantic import ValidationError

from api.schemas.availability import WeeklyAvailability
from api.utils.availability import availability_day_of_week


class AvailabilityContractTests(unittest.TestCase):
    def test_separate_windows_and_empty_states(self):
        data = {"windows": [
            {"day_of_week": 1, "start_minute": 540, "end_minute": 720},
            {"day_of_week": 1, "start_minute": 900, "end_minute": 960},
        ]}
        self.assertEqual(WeeklyAvailability.model_validate(data).model_dump(), data)
        self.assertEqual(WeeklyAvailability.model_validate({"windows": []}).model_dump(), {"windows": []})

    def test_canonical_order_merges_overlap_adjacency_and_duplicates_without_mutation(self):
        data = {"windows": [
            {"day_of_week": 2, "start_minute": 0, "end_minute": 30},
            {"day_of_week": 1, "start_minute": 600, "end_minute": 660},
            {"day_of_week": 1, "start_minute": 540, "end_minute": 630},
            {"day_of_week": 1, "start_minute": 660, "end_minute": 720},
            {"day_of_week": 1, "start_minute": 900, "end_minute": 960},
        ]}
        result = WeeklyAvailability.model_validate(data)
        self.assertEqual(result.model_dump()["windows"], [
            {"day_of_week": 1, "start_minute": 540, "end_minute": 720},
            {"day_of_week": 1, "start_minute": 900, "end_minute": 960},
            {"day_of_week": 2, "start_minute": 0, "end_minute": 30},
        ])
        self.assertEqual(data["windows"][1]["end_minute"], 660)
        duplicated = {"windows": [result.windows[0], result.windows[0]]}
        self.assertEqual(len(WeeklyAvailability.model_validate(duplicated).windows), 1)

    def test_full_days_and_saturday_to_sunday_are_separate_windows(self):
        data = {"windows": [
            {"day_of_week": 0, "start_minute": 0, "end_minute": 30},
            {"day_of_week": 6, "start_minute": 1410, "end_minute": 1440},
        ]}
        self.assertEqual(WeeklyAvailability.model_validate(data).model_dump(), data)
        full = {"windows": [
            {"day_of_week": day, "start_minute": 0, "end_minute": 1440} for day in range(7)
        ]}
        self.assertEqual(WeeklyAvailability.model_validate(full).model_dump(), full)

    def test_invalid_fields_ranges_and_coercion_are_rejected(self):
        base = {"day_of_week": 0, "start_minute": 0, "end_minute": 30}
        for changes in (
            {"day_of_week": -1}, {"day_of_week": 7}, {"day_of_week": True},
            {"day_of_week": "1"}, {"start_minute": 15}, {"start_minute": -30},
            {"end_minute": 1470}, {"end_minute": 0}, {"start_minute": 30},
            {"start_minute": 1410, "end_minute": 30}, {"start_minute": 0.0},
            {"timezone": "UTC"},
        ):
            with self.subTest(changes=changes), self.assertRaises(ValidationError):
                WeeklyAvailability.model_validate({"windows": [{**base, **changes}]})
        for invalid in (
            {"configured": False, "windows": []},
            {"configured": "true", "windows": []},
            {"windows": [base] * 337},
            {},
            {"windows": None},
            {"windows": [], "user_id": "someone-else"},
        ):
            with self.subTest(invalid=invalid), self.assertRaises(ValidationError):
                WeeklyAvailability.model_validate(invalid)

    def test_python_weekdays_and_toronto_conversion(self):
        for day in range(7):
            self.assertEqual(availability_day_of_week(date(2026, 11, 8 + day)), day)
        # Monday UTC is still Sunday in Toronto, in winter and summer.
        self.assertEqual(availability_day_of_week(datetime(2026, 11, 9, 2, tzinfo=timezone.utc)), 0)
        self.assertEqual(availability_day_of_week(datetime(2026, 7, 6, 2, tzinfo=timezone.utc)), 0)
        # Naive database event timestamps are already Toronto local time.
        self.assertEqual(availability_day_of_week(datetime(2026, 11, 9, 2)), 1)
