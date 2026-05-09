"""
NEXUS JUNCTION — Audio Detection Module
Simulates YAMNet acoustic emergency vehicle detection with inverse-square-law
distance estimation. Pushes siren events with rising/falling dB trends.
"""
import asyncio
import math
import random
import time
from dataclasses import dataclass
from typing import Optional


# dB → urgency mapping (inverse square law approximation)
def db_to_urgency(db: float) -> str:
    if db >= 85:
        return "CRITICAL"
    elif db >= 70:
        return "HIGH"
    elif db >= 55:
        return "MEDIUM"
    else:
        return "LOW"


def db_to_distance_m(db: float) -> float:
    """Inverse square law: reference 90dB @ 30m."""
    ref_db = 90.0
    ref_dist = 30.0
    delta = ref_db - db
    dist = ref_dist * (10 ** (delta / 20))
    return round(max(5.0, min(800.0, dist)), 1)


def distance_to_eta(distance_m: float, speed_kmh: float = 60.0) -> float:
    speed_ms = speed_kmh / 3.6
    return round(distance_m / speed_ms, 1)


@dataclass
class AudioState:
    siren_detected: bool = False
    sound_class: str = "ambient"
    db_level: float = 38.0
    estimated_distance_m: float = 500.0
    estimated_eta_seconds: float = 999.0
    urgency: str = "CLEAR"
    approaching: bool = False
    confidence: float = 0.0
    timestamp: float = 0.0

    def to_dict(self) -> dict:
        return {
            "siren_detected": self.siren_detected,
            "sound_class": self.sound_class,
            "db_level": round(self.db_level, 1),
            "estimated_distance_m": self.estimated_distance_m,
            "estimated_eta_seconds": self.estimated_eta_seconds,
            "urgency": self.urgency,
            "approaching": self.approaching,
            "confidence": round(self.confidence, 3),
            "timestamp": self.timestamp,
        }


SIREN_CLASSES = ["ambulance_siren", "police_siren", "fire_truck_siren"]


class AudioDetectionService:
    """
    Simulates an acoustic emergency detection pipeline.

    Event lifecycle:
    1. APPROACH phase (8s): dB rises from ~50 → ~87 (vehicle approaching)
    2. PASSING phase  (4s): dB at peak, vehicle at junction
    3. RECEDE phase   (6s): dB falls from ~87 → ~48 (vehicle passed)
    4. SILENT phase: ambient noise only
    """

    APPROACH_DURATION = 8.0
    PASSING_DURATION  = 4.0
    RECEDE_DURATION   = 6.0

    def __init__(self, sim_engine=None):
        self._sim = sim_engine
        self._state = AudioState(timestamp=time.time())
        self._event_active = False
        self._event_phase: str = "silent"  # approach | passing | recede | silent
        self._phase_elapsed: float = 0.0
        self._event_class: str = "ambulance_siren"
        self._event_confidence: float = 0.0
        self._emergency_start_time: Optional[float] = None
        self._response_logged: bool = False

    # ── External trigger (from sim_engine or UI) ──────────────────────────────
    def trigger_event(self, sound_class: Optional[str] = None):
        if not self._event_active:
            self._event_active = True
            self._event_phase = "approach"
            self._phase_elapsed = 0.0
            self._event_class = sound_class or random.choice(SIREN_CLASSES)
            self._event_confidence = random.uniform(0.85, 0.99)
            self._emergency_start_time = time.time()
            self._response_logged = False

    def _ambient_db(self) -> float:
        """Simulate ambient city noise 35–48 dB with slight variation."""
        return 38.0 + math.sin(time.time() * 0.3) * 4 + random.gauss(0, 1.5)

    def tick(self, delta_seconds: float) -> AudioState:
        """Advance audio simulation by delta_seconds and return current state."""

        if not self._event_active:
            db = self._ambient_db()
            self._state = AudioState(
                siren_detected=False,
                sound_class="ambient",
                db_level=db,
                estimated_distance_m=500.0,
                estimated_eta_seconds=999.0,
                urgency="CLEAR",
                approaching=False,
                confidence=0.0,
                timestamp=time.time(),
            )
            return self._state

        self._phase_elapsed += delta_seconds

        if self._event_phase == "approach":
            progress = min(1.0, self._phase_elapsed / self.APPROACH_DURATION)
            # Ease-in curve: slow start, faster as vehicle nears
            db = 50.0 + (87.0 - 50.0) * (progress ** 1.5)
            approaching = True
            if self._phase_elapsed >= self.APPROACH_DURATION:
                self._event_phase = "passing"
                self._phase_elapsed = 0.0

        elif self._event_phase == "passing":
            db = random.uniform(85.0, 90.0)
            approaching = False
            if self._phase_elapsed >= self.PASSING_DURATION:
                self._event_phase = "recede"
                self._phase_elapsed = 0.0

        elif self._event_phase == "recede":
            progress = min(1.0, self._phase_elapsed / self.RECEDE_DURATION)
            db = 87.0 - (87.0 - 42.0) * (progress ** 1.2)
            approaching = False
            if self._phase_elapsed >= self.RECEDE_DURATION:
                self._event_active = False
                self._event_phase = "silent"
                self._phase_elapsed = 0.0
                # Return ambient immediately
                return self.tick(0)
        else:
            db = self._ambient_db()
            approaching = False

        db += random.gauss(0, 1.2)
        distance = db_to_distance_m(db)
        eta = distance_to_eta(distance)
        urgency = db_to_urgency(db)
        confidence = self._event_confidence * random.uniform(0.95, 1.05)
        confidence = round(min(1.0, max(0.0, confidence)), 3)

        self._state = AudioState(
            siren_detected=True,
            sound_class=self._event_class,
            db_level=round(db, 1),
            estimated_distance_m=distance,
            estimated_eta_seconds=eta,
            urgency=urgency,
            approaching=approaching,
            confidence=confidence,
            timestamp=time.time(),
        )
        return self._state

    @property
    def current_state(self) -> AudioState:
        return self._state

    def is_emergency(self) -> bool:
        return self._event_active and self._state.confidence >= 0.80
