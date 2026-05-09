"""
NEXUS JUNCTION — Database Models & Event Logger
SQLAlchemy ORM with SQLite (nexus.db).
"""
import json
import time
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Column, Integer, Float, String, Boolean, Text,
    create_engine, event as sa_event
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session

DATABASE_URL = "sqlite:///./nexus.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# Enable WAL mode for concurrent reads
@sa_event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ── ORM Models ────────────────────────────────────────────────────────────────

class JunctionSnapshot(Base):
    __tablename__ = "junction_snapshots"
    id              = Column(Integer, primary_key=True, index=True)
    timestamp       = Column(Float, default=time.time, index=True)
    lane            = Column(String(10), index=True)
    vehicle_count   = Column(Integer)
    density_score   = Column(Float)
    signal_state    = Column(String(10))
    green_duration  = Column(Float)


class EmergencyEvent(Base):
    __tablename__ = "emergency_events"
    id                  = Column(Integer, primary_key=True, index=True)
    start_time          = Column(Float, index=True)
    end_time            = Column(Float, nullable=True)
    detection_type      = Column(String(20))   # audio / visual / both
    db_level            = Column(Float, nullable=True)
    estimated_distance  = Column(Float, nullable=True)
    lane_affected       = Column(String(10))
    response_time_ms    = Column(Float, nullable=True)


class SignalCycle(Base):
    __tablename__ = "signal_cycles"
    id                  = Column(Integer, primary_key=True, index=True)
    cycle_number        = Column(Integer, index=True)
    start_time          = Column(Float)
    phase_durations_json = Column(Text)
    mode                = Column(String(20))
    efficiency_score    = Column(Float)


class Prediction(Base):
    __tablename__ = "predictions"
    id                  = Column(Integer, primary_key=True, index=True)
    created_at          = Column(Float, default=time.time)
    target_time         = Column(Float)
    lane                = Column(String(10))
    predicted_density   = Column(Float)
    confidence_lower    = Column(Float)
    confidence_upper    = Column(Float)
    actual_density      = Column(Float, nullable=True)


# ── Init ──────────────────────────────────────────────────────────────────────

def init_db():
    Base.metadata.create_all(bind=engine)


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Event Logger ──────────────────────────────────────────────────────────────

class EventLogger:
    def __init__(self):
        self._active_emergency_id: Optional[int] = None

    def log_snapshot(self, lane: str, vehicle_count: int, density_score: float,
                     signal_state: str, green_duration: float):
        with SessionLocal() as db:
            snap = JunctionSnapshot(
                timestamp=time.time(),
                lane=lane,
                vehicle_count=vehicle_count,
                density_score=density_score,
                signal_state=signal_state,
                green_duration=green_duration,
            )
            db.add(snap)
            db.commit()

    def log_emergency_start(self, detection_type: str, db_level: float,
                            estimated_distance: float, lane_affected: str) -> int:
        with SessionLocal() as db:
            ev = EmergencyEvent(
                start_time=time.time(),
                detection_type=detection_type,
                db_level=db_level,
                estimated_distance=estimated_distance,
                lane_affected=lane_affected,
            )
            db.add(ev)
            db.commit()
            db.refresh(ev)
            self._active_emergency_id = ev.id
            return ev.id

    def log_emergency_end(self, response_time_ms: float):
        if self._active_emergency_id is None:
            return
        with SessionLocal() as db:
            ev = db.get(EmergencyEvent, self._active_emergency_id)
            if ev:
                ev.end_time = time.time()
                ev.response_time_ms = response_time_ms
                db.commit()
        self._active_emergency_id = None

    def log_signal_cycle(self, cycle_number: int, phase_durations: dict,
                         mode: str, efficiency_score: float):
        with SessionLocal() as db:
            sc = SignalCycle(
                cycle_number=cycle_number,
                start_time=time.time(),
                phase_durations_json=json.dumps(phase_durations),
                mode=mode,
                efficiency_score=efficiency_score,
            )
            db.add(sc)
            db.commit()

    def log_prediction(self, target_time: float, lane: str, predicted_density: float,
                       confidence_lower: float, confidence_upper: float):
        with SessionLocal() as db:
            pred = Prediction(
                target_time=target_time,
                lane=lane,
                predicted_density=predicted_density,
                confidence_lower=confidence_lower,
                confidence_upper=confidence_upper,
            )
            db.add(pred)
            db.commit()

    def query_analytics(self, from_ts: float, to_ts: float) -> dict:
        with SessionLocal() as db:
            snaps = db.query(JunctionSnapshot).filter(
                JunctionSnapshot.timestamp >= from_ts,
                JunctionSnapshot.timestamp <= to_ts,
            ).order_by(JunctionSnapshot.timestamp).all()

            emergencies = db.query(EmergencyEvent).filter(
                EmergencyEvent.start_time >= from_ts,
                EmergencyEvent.start_time <= to_ts,
            ).all()

            cycles = db.query(SignalCycle).filter(
                SignalCycle.start_time >= from_ts,
                SignalCycle.start_time <= to_ts,
            ).all()

        return {
            "snapshots": [
                {
                    "timestamp": s.timestamp, "lane": s.lane,
                    "vehicle_count": s.vehicle_count, "density_score": s.density_score,
                    "signal_state": s.signal_state,
                }
                for s in snaps
            ],
            "emergencies": [
                {
                    "id": e.id, "start_time": e.start_time, "end_time": e.end_time,
                    "detection_type": e.detection_type, "db_level": e.db_level,
                    "lane_affected": e.lane_affected, "response_time_ms": e.response_time_ms,
                }
                for e in emergencies
            ],
            "cycles_count": len(cycles),
            "avg_efficiency": round(
                sum(c.efficiency_score for c in cycles) / max(len(cycles), 1), 2
            ),
        }


# Singleton
event_logger = EventLogger()
