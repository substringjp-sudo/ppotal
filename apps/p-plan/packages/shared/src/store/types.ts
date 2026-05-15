import { Trip, FlightSegment, DrivingSegment, PublicTransportSegment, TransportReservation, AccommodationSegment, TripEvent } from '../types/trip';
import { WizardState } from './wizardStore';

import { TripInfoSlice } from './slices/tripInfoSlice';
import { TransportSlice } from './slices/transportSlice';
import { AccommodationSlice } from './slices/accommodationSlice';
import { TimelineSlice } from './slices/timelineSlice';
import { BudgetSlice } from './slices/budgetSlice';
import { ReservationSlice } from './slices/reservationSlice';
import { CommentSlice } from './slices/commentSlice';

export interface TripState extends TripInfoSlice, TransportSlice, AccommodationSlice, TimelineSlice, BudgetSlice, ReservationSlice, CommentSlice {}
