import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable, combineLatest, of } from 'rxjs';
import { firestore } from 'firebase';
import { UserService } from './user.service';
import { switchMap, map } from 'rxjs/operators';
import { User } from '../interfaces/user';
import {
  Notification,
  NotificationWithUserAndThing,
} from '../interfaces/notification';
import { ThingService } from './thing.service';
import { Thing } from '../interfaces/thing';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  constructor(
    private db: AngularFirestore,
    private userService: UserService,
    private thingService: ThingService
  ) {}

  clearNotification(uid: string): Promise<void> {
    return this.db.doc<User>(`users/${uid}`).update({
      notificationCount: 0,
    });
  }

  getNotificationsByUid(
    uid: string
  ): Observable<NotificationWithUserAndThing[]> {
    return this.db
      .collection<Notification>(`users/${uid}/notifications`, (ref) =>
        ref.orderBy('updateAt', 'desc')
      )
      .valueChanges()
      .pipe(
        switchMap((notifications: Notification[]) => {
          const distinctUids: string[] = Array.from(
            new Set(notifications.map((item) => item.fromUid))
          );
          const users$: Observable<User[]> = combineLatest(
            distinctUids.map((uid) => this.userService.getUserByID(uid))
          );
          const distinctThings: string[] = Array.from(
            new Set(notifications.map((item) => item.thingId))
          );
          const things$: Observable<Thing[]> = combineLatest(
            distinctThings.map((thingId) =>
              this.thingService.getThingByID(thingId)
            )
          );
          return combineLatest([of(notifications), users$, things$]);
        }),
        map(([notifications, users, things]) => {
          return notifications.map((item) => {
            return {
              ...item,
              user: users.find((user) => user.uid === item.fromUid),
              thing: things.find((thing) => thing.id === item.thingId),
            };
          });
        })
      );
  }
}
