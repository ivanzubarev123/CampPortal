import pytest
from pydantic import ValidationError
from app.schemas import GroupCreate

def test_group_age_validation():
    with pytest.raises(ValidationError):
        GroupCreate(name="Группа", shift_id=1, min_age=10, max_age=5)

def test_group_age_optional():
    # Должно работать без ошибок
    group = GroupCreate(name="Группа", shift_id=1)
    assert group.name == "Группа"