"""
NEXUS JUNCTION — Adaptive Signal Timing Controller
"""
import time
from dataclasses import dataclass, field
from typing import Dict, Optional, List
from enum import Enum

LANES = ["NORTH", "EAST", "SOUTH", "WEST"]
BASE_TIME = 15.0
WEIGHT_FACTOR = 0.75
MAX_GREEN = 90.0
MIN_GREEN = 10.0
YELLOW_TIME = 3.0
MAX_STARVATION_CYCLES = 3

DOWNSTREAM_JUNCTIONS = [
    {"name": "Junction B", "distance_m": 400},
    {"name": "Junction C", "distance_m": 850},
    {"name": "Junction D", "distance_m": 1300},
]

class SignalState(str, Enum):
    GREEN = "GREEN"
    YELLOW = "YELLOW"
    RED = "RED"

class ControllerMode(str, Enum):
    ADAPTIVE = "ADAPTIVE"
    EMERGENCY = "EMERGENCY"

@dataclass
class PhaseStatus:
    state: SignalState
    time_remaining: float
    green_duration: float
    next_green_in: float = 0.0

@dataclass
class SignalSnapshot:
    timestamp: float
    cycle_number: int
    active_phase: str
    phases: Dict[str, PhaseStatus]
    mode: ControllerMode
    efficiency_score: float
    emergency_lane: Optional[str] = None
    emergency_eta: Optional[float] = None
    green_wave: List[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        phases_dict = {}
        for lane, ps in self.phases.items():
            phases_dict[lane] = {
                "state": ps.state.value,
                "time_remaining": round(ps.time_remaining, 1),
                "green_duration": round(ps.green_duration, 1),
                "next_green_in": round(ps.next_green_in, 1),
            }
        return {
            "timestamp": self.timestamp,
            "cycle_number": self.cycle_number,
            "active_phase": self.active_phase,
            "phases": phases_dict,
            "mode": self.mode.value,
            "efficiency_score": round(self.efficiency_score, 1),
            "emergency_lane": self.emergency_lane,
            "emergency_eta": round(self.emergency_eta, 1) if self.emergency_eta else None,
            "green_wave": self.green_wave,
        }


def compute_green_wave(emergency_lane: str, eta_seconds: float, speed_kmh: float = 60.0) -> List[dict]:
    speed_ms = speed_kmh / 3.6
    results = []
    for junc in DOWNSTREAM_JUNCTIONS:
        travel = junc["distance_m"] / speed_ms
        results.append({
            "name": junc["name"],
            "distance_m": junc["distance_m"],
            "green_at_offset_s": round(eta_seconds + travel, 1),
        })
    return results


class SignalController:
    def __init__(self):
        self._cycle_number = 0
        self._phase_index = 0
        self._phase_elapsed = 0.0
        self._mode = ControllerMode.ADAPTIVE
        self._green_durations: Dict[str, float] = {l: BASE_TIME for l in LANES}
        self._is_yellow = False
        self._yellow_elapsed = 0.0
        self._density_history: Dict[str, List[float]] = {l: [] for l in LANES}
        self._red_cycles: Dict[str, int] = {l: 0 for l in LANES}
        self._emergency_lane: Optional[str] = None
        self._emergency_eta: Optional[float] = None
        self._last_tick = time.time()
        self._efficiency_score = 75.0
        self._green_wave: List[dict] = []
        self._emg_jump_pending = False

    @property
    def active_lane(self) -> str:
        return LANES[self._phase_index]

    def update_densities(self, density_map: Dict[str, float]):
        for lane, d in density_map.items():
            hist = self._density_history[lane]
            hist.append(d)
            if len(hist) > 10:
                hist.pop(0)

    def _calc_green_time(self, lane: str) -> float:
        hist = self._density_history[lane]
        if not hist:
            return BASE_TIME
        avg = sum(hist[-3:]) / max(len(hist[-3:]), 1)
        if len(hist) >= 2 and all(d > 80 for d in hist[-2:]):
            avg *= 1.20
        gt = BASE_TIME + avg * WEIGHT_FACTOR
        return max(MIN_GREEN, min(MAX_GREEN, gt))

    def _update_efficiency(self, density_map: Dict[str, float]):
        if not density_map:
            return
        avg_d = sum(density_map.values()) / len(density_map)
        base = 100 - avg_d * 0.5
        if self._mode == ControllerMode.EMERGENCY:
            base -= 8
        self._efficiency_score = self._efficiency_score * 0.9 + base * 0.1

    def trigger_emergency(self, lane: str, eta_seconds: Optional[float] = None):
        if self._mode == ControllerMode.EMERGENCY:
            return
        self._mode = ControllerMode.EMERGENCY
        self._emergency_lane = lane
        self._emergency_eta = eta_seconds or 15.0
        self._green_wave = compute_green_wave(lane, self._emergency_eta)
        target_idx = LANES.index(lane)
        if self._phase_index == target_idx and not self._is_yellow:
            self._green_durations[lane] = MAX_GREEN
            self._phase_elapsed = 0.0
        else:
            self._is_yellow = True
            self._yellow_elapsed = 0.0
            self._emg_jump_pending = True

    def clear_emergency(self):
        if self._mode != ControllerMode.EMERGENCY:
            return
        self._mode = ControllerMode.ADAPTIVE
        self._emergency_lane = None
        self._emergency_eta = None
        self._green_wave = []
        self._emg_jump_pending = False
        self._is_yellow = True
        self._yellow_elapsed = 0.0

    def tick(self, density_map: Optional[Dict[str, float]] = None) -> SignalSnapshot:
        now = time.time()
        dt = min(now - self._last_tick, 2.0)
        self._last_tick = now

        if density_map:
            self.update_densities(density_map)
            self._update_efficiency(density_map)

        if self._is_yellow:
            self._yellow_elapsed += dt
            if self._yellow_elapsed >= YELLOW_TIME:
                self._is_yellow = False
                self._yellow_elapsed = 0.0
                self._phase_elapsed = 0.0
                if self._emg_jump_pending and self._emergency_lane:
                    self._emg_jump_pending = False
                    self._phase_index = LANES.index(self._emergency_lane)
                    self._green_durations[self._emergency_lane] = MAX_GREEN
                else:
                    prev = self.active_lane
                    self._red_cycles[prev] = self._red_cycles.get(prev, 0) + 1
                    self._phase_index = (self._phase_index + 1) % 4
                    if self._phase_index == 0:
                        self._cycle_number += 1
                    self._red_cycles[self.active_lane] = 0
                    self._green_durations[self.active_lane] = self._calc_green_time(self.active_lane)
        else:
            self._phase_elapsed += dt
            current_green = self._green_durations[self.active_lane]
            at_max_emg = (
                self._mode == ControllerMode.EMERGENCY
                and self.active_lane == self._emergency_lane
            )
            if self._phase_elapsed >= current_green and not at_max_emg:
                self._is_yellow = True
                self._yellow_elapsed = 0.0

        # Build snapshot
        phases: Dict[str, PhaseStatus] = {}
        remaining_current = max(0.0, self._green_durations[self.active_lane] - self._phase_elapsed)
        if self._is_yellow:
            remaining_current = max(0.0, YELLOW_TIME - self._yellow_elapsed)

        accum_after = remaining_current + (YELLOW_TIME if not self._is_yellow else 0)

        for i, lane in enumerate(LANES):
            offset = (i - self._phase_index) % 4
            if offset == 0:
                if self._is_yellow:
                    st = SignalState.YELLOW
                elif (self._mode == ControllerMode.EMERGENCY
                      and self._emergency_lane is not None
                      and lane != self._emergency_lane):
                    st = SignalState.RED
                else:
                    st = SignalState.GREEN
                tr = remaining_current
                ng = 0.0
            else:
                if self._mode == ControllerMode.EMERGENCY and lane == self._emergency_lane and self._emg_jump_pending:
                    st = SignalState.RED
                    tr = self._green_durations.get(lane, BASE_TIME)
                    ng = accum_after
                else:
                    st = SignalState.RED
                    tr = self._green_durations.get(lane, BASE_TIME)
                    acc2 = accum_after
                    for j in range(1, offset):
                        fl = LANES[(self._phase_index + j) % 4]
                        acc2 += self._green_durations.get(fl, BASE_TIME) + YELLOW_TIME
                    ng = acc2

            phases[lane] = PhaseStatus(
                state=st,
                time_remaining=round(max(0.0, tr), 1),
                green_duration=round(self._green_durations.get(lane, BASE_TIME), 1),
                next_green_in=round(max(0.0, ng), 1),
            )

        return SignalSnapshot(
            timestamp=now,
            cycle_number=self._cycle_number,
            active_phase=self.active_lane,
            phases=phases,
            mode=self._mode,
            efficiency_score=self._efficiency_score,
            emergency_lane=self._emergency_lane,
            emergency_eta=self._emergency_eta,
            green_wave=self._green_wave,
        )
