from app.schemas.llm import Correction, ErrorCandidate


def make_error(word: str, span: list[int], correction: str = "corrected") -> ErrorCandidate:
    return ErrorCandidate(
        word=word,
        translation="",
        span=span,
        error_type="grammar",
        correction=correction,
        explanation="",
    )


def test_repairs_off_by_one_span_by_matching_word() -> None:
    correction = Correction(
        original="dame frases hasta que no te digo parar",
        corrected="dame frases hasta que no te diga parar",
        error_candidates=[make_error("no te digo", [23, 32], "no te diga")],
    )

    error = correction.error_candidates[0]
    assert error.span == [22, 32]
    assert error.word == "no te digo"


def test_expands_span_that_cuts_through_word() -> None:
    correction = Correction(
        original="Si tuvieran más tiempo, estudiarian todos los días.",
        corrected="Si tuvieran más tiempo, estudiarían todos los días.",
        error_candidates=[make_error("estudiaria", [24, 34], "estudiarían")],
    )

    error = correction.error_candidates[0]
    assert error.word == "estudiarian"
    assert correction.original[error.span[0] : error.span[1]] == "estudiarian"


def test_skips_unrecoverable_empty_and_overlapping_candidates() -> None:
    correction = Correction(
        original="yo soy bien",
        corrected="yo estoy bien",
        error_candidates=[
            make_error("", [3, 3]),
            make_error("soy", [3, 6], "estoy"),
            make_error("yo soy", [0, 6], "yo estoy"),
        ],
    )

    assert len(correction.error_candidates) == 1
    assert correction.error_candidates[0].word == "yo soy"


def test_does_not_expand_unrelated_bad_span_to_nearby_word() -> None:
    correction = Correction(
        original="yo soy bien",
        corrected="yo estoy bien",
        error_candidates=[make_error("zzz", [0, 1], "estoy")],
    )

    assert correction.error_candidates == []
