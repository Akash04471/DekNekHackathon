"""
NEXUS JUNCTION — Simulation Engine
Generates realistic per-lane traffic metrics using sinusoidal functions + noise.
Replaces real YOLOv8/camera input for demo/hackathon mode.
"""
import math
import random
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from enum import Enum


class Scenario(str, Enum):
    MORNING_RUSH = "Morning Rush"
    NORMAL_AFTERNOON = "Normal Afternoon"
    EMERGENCY = "Emergency"
    SEVERE_CONGESTION = "Severe Congestion"
    LATE_NIGHT = "Late Night"


class SpeedMultiplier(float, Enum):
    REAL_TIME = 1.0
    FAST = 5.0
    HYPERSPEED = 60.0


LANES = ["NORTH", "EAST", "SOUTH", "WEST"]

# Scenario base density offsets
SCENARIO_PARAMS = {
    Scenario.MORNING_RUSH: {
        "base_density": 78, "noise": 12, "peak_lanes": ["NORTH", "EAST"],
        "peak_multiplier": 1.4, "emergency_chance": 0.0
    },
    Scenario.NORMAL_AFTERNOON: {
        "base_density": 42, "noise": 10, "peak_lanes": [],
        "peak_multiplier": 1.0, "emergency_chance": 0.0
    },
    Scenario.EMERGENCY: {
        "base_density": 55, "noise": 8, "peak_lanes": ["SOUTH"],
        "peak_multiplier": 1.2, "emergency_chance": 1.0
    },
    Scenario.SEVERE_CONGESTION: {
        "base_density": 88, "noise": 6, "peak_lanes": LANES,
        "peak_multiplier": 1.1, "emergency_chance": 0.0
    },
    Scenario.LATE_NIGHT: {
        "base_density": 8, "noise": 5, "peak_lanes": [],
        "peak_multiplier": 1.0, "emergency_chance": 0.0
    },
}

# Lane phase offsets so each lane peaks at different times
LANE_PHASE_OFFSETS = {
    "NORTH": 0.0,
    "EAST": math.pi / 2,
    "SOUTH": math.pi,
    "WEST": 3 * math.pi / 2,
}


@dataclass
class VehicleComposition:
    car: int = 0
    truck: int = 0
    bike: int = 0
    bus: int = 0
    emergency: int = 0


@dataclass
class LaneMetrics:
    lane: str
    vehicle_count: int
    density_score: float           # 0–100
    avg_speed_kmh: float           # km/h estimate
    queue_length_m: float          # meters
    vehicle_types: VehicleComposition = field(default_factory=VehicleComposition)
    has_emergency: bool = False
    timestamp: float = field(default_factory=time.time)


class SimulationEngine:
    def __init__(self):
        self.scenario: Scenario = Scenario.NORMAL_AFTERNOON
        self.speed_multiplier: float = 1.0
        self._start_real_time: float = time.time()
        self._sim_time_offset: float = 0.0
        self._last_real_time: float = time.time()
        self._emergency_active: bool = False
        self._emergency_lane: Optional[str] = None
        self._emergency_timer: float = 0.0
        self._emergency_duration: float = 25.0   # seconds of sim time
        self._next_emergency_at: float = random.uniform(60, 90)
        self._sim_elapsed: float = 0.0
        self._forced_emergency: bool = False

    # ── Time Management ──────────────────────────────────────────────────────
    def _advance_time(self) -> float:
        """Return elapsed simulated seconds since last call."""
        now = time.time()
        real_delta = now - self._last_real_time
        self._last_real_time = now
        sim_delta = real_delta * self.speed_multiplier
        self._sim_elapsed += sim_delta
        return sim_delta

    def get_sim_time(self) -> float:
        """Simulated seconds elapsed."""
        return self._sim_elapsed

    # ── Scenario & Speed ─────────────────────────────────────────────────────
    def set_scenario(self, scenario: Scenario):
        self.scenario = scenario
        if scenario == Scenario.EMERGENCY:
            self._trigger_emergency()

    def set_speed(self, multiplier: float):
        self.speed_multiplier = multiplier

    # ── Emergency Events ─────────────────────────────────────────────────────
    def _trigger_emergency(self, lane: Optional[str] = None):
        if not self._emergency_active:
            self._emergency_active = True
            self._emergency_lane = lane or random.choice(LANES)
            self._emergency_timer = 0.0
            self._forced_emergency = True

    def trigger_emergency_external(self, lane: Optional[str] = None):
        """Called externally (API/UI button)."""
        self._trigger_emergency(lane)

    def clear_emergency(self):
        self._emergency_active = False
        self._emergency_lane = None
        self._emergency_timer = 0.0
        self._forced_emergency = False

    # ── Core Metric Generation ───────────────────────────────────────────────
    def _base_density(self, lane: str, t: float) -> float:
        """Sinusoidal base density for a lane at simulated time t."""
        params = SCENARIO_PARAMS[self.scenario]
        phase = LANE_PHASE_OFFSETS[lane]

        # Slow oscillation (40s period) for micro variation
        micro = math.sin(t / 40 + phase) * 8
        # Medium wave (120s) for flow patterns
        medium = math.sin(t / 120 + phase * 0.5) * 14
        # Noise
        noise = random.gauss(0, params["noise"] * 0.3)

        density = params["base_density"] + micro + medium + noise

        if lane in params["peak_lanes"]:
            density *= params["peak_multiplier"]

        return max(0.0, min(100.0, density))

    def _compose_vehicles(self, count: int, has_emergency: bool) -> VehicleComposition:
        vc = VehicleComposition()
        remaining = count
        if has_emergency and remaining > 0:
            vc.emergency = 1
            remaining -= 1
        vc.truck = int(remaining * 0.08)
        vc.bus = int(remaining * 0.05)
        vc.bike = int(remaining * 0.20)
        vc.car = remaining - vc.truck - vc.bus - vc.bike
        return vc

    def compute_metrics(self) -> Dict[str, LaneMetrics]:
        """Advance simulation and return current metrics for all lanes."""
        self._advance_time()
        t = self._sim_elapsed
        params = SCENARIO_PARAMS[self.scenario]

        # Check auto-emergency trigger
        if not self._emergency_active and t >= self._next_emergency_at:
            if params["emergency_chance"] > 0 or random.random() < 0.015:
                self._trigger_emergency()
                self._next_emergency_at = t + random.uniform(60, 90)

        # Advance emergency timer
        if self._emergency_active:
            self._emergency_timer += 0.1  # ~called every 100ms
            if self._emergency_timer >= self._emergency_duration:
                self.clear_emergency()

        metrics: Dict[str, LaneMetrics] = {}
        for lane in LANES:
            density = self._base_density(lane, t)
            has_emg = self._emergency_active and self._emergency_lane == lane

            # If emergency lane → boost density (traffic backing up)
            if has_emg:
                density = min(100.0, density + 20)

            # Vehicle count from density (ROI ~500 pixel area unit)
            count = int(density / 100 * 25 + random.gauss(0, 1))
            count = max(0, count)

            # Speed inversely proportional to density
            speed = max(5.0, 80.0 - density * 0.75 + random.gauss(0, 3))

            # Queue length proportional to count
            queue = count * random.uniform(6.5, 8.5)  # avg vehicle spacing

            vc = self._compose_vehicles(count, has_emg)

            metrics[lane] = LaneMetrics(
                lane=lane,
                vehicle_count=count,
                density_score=round(density, 1),
                avg_speed_kmh=round(speed, 1),
                queue_length_m=round(queue, 1),
                vehicle_types=vc,
                has_emergency=has_emg,
                timestamp=time.time(),
            )

        return metrics

    # ── State Accessors ──────────────────────────────────────────────────────
    @property
    def emergency_active(self) -> bool:
        return self._emergency_active

    @property
    def emergency_lane(self) -> Optional[str]:
        return self._emergency_lane

    @property
    def emergency_progress(self) -> float:
        """0.0 → 1.0 through the emergency duration."""
        if not self._emergency_active:
            return 0.0
        return min(1.0, self._emergency_timer / self._emergency_duration)

    def state_dict(self) -> dict:
        return {
            "scenario": self.scenario.value,
            "speed_multiplier": self.speed_multiplier,
            "sim_elapsed_seconds": round(self._sim_elapsed, 1),
            "emergency_active": self._emergency_active,
            "emergency_lane": self._emergency_lane,
            "emergency_progress": round(self.emergency_progress, 3),
        }
