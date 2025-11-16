// src/app/tab3/tab3.page.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LoadingController,
  ToastController,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSearchbar,
  IonList,
  IonItem,
  IonAvatar,
  IonLabel,
  IonButton,
  IonIcon,
  IonCard,
  IonSegment,
  IonSegmentButton,
} from '@ionic/angular/standalone';
import { Router, RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  searchOutline,
  personOutline,
  chevronForwardOutline,
  addOutline,
  removeOutline,
  restaurantOutline,
  bookOutline,
  peopleOutline,
  lockClosedOutline,
  heart 
} from 'ionicons/icons';

import { UserService, SimpleUser } from '../services/user';
import { AuthService, UserProfile } from '../services/auth';
import { RecipeService, Recipe } from '../services/recipe';

import { Subject, Subscription, of } from 'rxjs'; // Removed EMPTY, using of()
import { debounceTime, switchMap, map, catchError } from 'rxjs/operators'; // Removed distinctUntilChanged

@Component({
  selector: 'app-tab3',
  templateUrl: './tab3.page.html',
  styleUrls: ['./tab3.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSearchbar,
    IonList,
    IonItem,
    IonAvatar,
    IonLabel,
    IonButton,
    IonIcon,
    IonCard,
    IonSegment,
    IonSegmentButton,
  ]
})
export class Tab3Page implements OnInit, OnDestroy {
  // --- Existing properties for user search ---
  searchTerm: string = '';
  foundUsers: SimpleUser[] = [];
  currentUser: UserProfile | null = null;
  // searchSubject will now ONLY be for *actual typed searches*
  private searchSubject = new Subject<string>();
  private userSubscription: Subscription | undefined;
  // This subscription is for the user-typed search ONLY
  private typedUserSearchSubscription: Subscription | undefined;
  public currentUserId: string | null = null;
  private loading: HTMLIonLoadingElement | null = null;

  // --- New properties for recipe search ---
  selectedSegment: string = 'recipes'; // 'recipes' or 'users', 'recipes' is default
  recipeSearchTerm: string = '';
  foundRecipes: Recipe[] = [];
  // recipeSearchSubject will now ONLY be for *actual typed searches*
  private recipeSearchSubject = new Subject<string>();
  private recipeSubscription: Subscription | undefined;
  // This subscription is for the recipe-typed search ONLY
  private typedRecipeSearchSubscription: Subscription | undefined;


  constructor(
    private userService: UserService,
    private authService: AuthService,
    private recipeService: RecipeService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private router: Router
  ) {
    addIcons({
      searchOutline,
      personOutline,
      chevronForwardOutline,
      addOutline,
      removeOutline,
      restaurantOutline,
      bookOutline,
      peopleOutline,
      lockClosedOutline,
      heart 
    });

    this.userSubscription = this.authService.user.subscribe((user: UserProfile | null) => {
      this.currentUser = user;
      this.currentUserId = user ? user._id : null;

      if (!user) {
        if (this.selectedSegment === 'users') {
          if (this.router.url !== '/login') {
              this.router.navigateByUrl('/login');
          }
          this.foundUsers = []; // Clear user results as they can't be seen
        }
        this.fetchRecipesInitial(); // Always load public recipes if not logged in
      } else {
        // User logged in or session refreshed
        // Re-fetch data for the currently selected segment
        if (this.selectedSegment === 'users') {
          this.fetchUsersInitial();
        } else { // 'recipes'
          this.fetchRecipesInitial();
        }
      }
    });
  }

  ngOnInit() {
    // Setup typed search observables *without* initial emission
    this.setupTypedUserSearchObservable();
    this.setupTypedRecipeSearchObservable();

    // Initial load for the default selected segment ('recipes')
    if (this.selectedSegment === 'recipes') {
      this.fetchRecipesInitial();
    } else if (this.currentUser && this.selectedSegment === 'users') {
      this.fetchUsersInitial();
    }
  }

  ngOnDestroy() {
    this.userSubscription?.unsubscribe();
    this.typedUserSearchSubscription?.unsubscribe(); // Unsubscribe typed search
    this.typedRecipeSearchSubscription?.unsubscribe(); // Unsubscribe typed search
    this.dismissLoading();
  }

  /**
   * Handles segment changes (Recipes/Chefs).
   * Clears search terms and results for a fresh start on the new segment.
   * Triggers initial search for the selected segment.
   * @param event The ionChange event object.
   */
  async segmentChanged(event: any) {
    const newSegment = event.detail.value;
    if (this.selectedSegment === newSegment) {
      console.log('Segment already selected:', newSegment);
    }

    this.selectedSegment = newSegment;
    console.log('Segment changed to:', this.selectedSegment);

    // Clear search terms and results when switching
    this.searchTerm = '';
    this.foundUsers = [];
    this.recipeSearchTerm = '';
    this.foundRecipes = [];

    // await this.dismissLoading();

    if (this.selectedSegment === 'users') {
      console.log('if users here')
      if (this.currentUser) {
        this.fetchUsersInitial(); // Direct fetch
      } else {
        this.router.navigateByUrl('/login');
      }
    } else if (this.selectedSegment === 'recipes') {
      this.fetchRecipesInitial(); // Direct fetch
    }
  }

  /**
   * Sets up the observable for *user-typed* user search.
   */
  setupTypedUserSearchObservable() {
    this.typedUserSearchSubscription = this.searchSubject.pipe(
      debounceTime(300),
      // NO distinctUntilChanged here, as we only use this for actual typing.
      // Initial loads will use direct service calls.
      switchMap((query: string) => {
        if (!this.currentUser) return of([]); // Should not happen if check in onSearchChange is correct
        // For typed search, always use searchUsers
        return this.userService.searchUsers(query);
      }),
      switchMap((users: SimpleUser[]) => {
          if (this.currentUserId) {
              return this.userService.getUserFollowing(this.currentUserId).pipe(
                  map((followingList: SimpleUser[]) => {
                      const followingIds = new Set(followingList.map((f: SimpleUser) => f._id));
                      return users.map(user => ({
                          ...user,
                          isFollowing: followingIds.has(user._id)
                      }));
                  }),
                  catchError((err: any) => {
                      console.error('Error fetching following list for typed search results:', err);
                      this.presentToast('Failed to check following status.', 'danger');
                      return of(users.map(user => ({ ...user, isFollowing: false })));
                  })
              );
          }
          return of(users.map(user => ({ ...user, isFollowing: false })));
      }),
      catchError((err: any) => {
        console.error('Error in typed user search stream:', err);
        this.presentToast(err.message || 'Failed to fetch chefs.', 'danger');
        return of<SimpleUser[]>([]);
      })
    ).subscribe(users => {
      this.foundUsers = users.filter(user => user._id !== this.currentUserId);
      this.dismissLoading();
    }, error => {
      console.error('User typed search subscription error:', error);
      this.dismissLoading();
    });
  }

  /**
   * Sets up the observable for *user-typed* recipe search.
   */
  setupTypedRecipeSearchObservable() {
    this.typedRecipeSearchSubscription = this.recipeSearchSubject.pipe(
      debounceTime(300),
      // NO distinctUntilChanged here
      switchMap((query: string) => {
        // For typed search, always use searchRecipes
        return this.recipeService.searchRecipes(query);
      }),
      catchError((err: any) => {
        console.error('Error in typed recipe search stream:', err);
        this.presentToast(err.message || 'Failed to fetch recipes.', 'danger');
        return of<Recipe[]>([]);
      })
    ).subscribe(recipes => {
      this.foundRecipes = recipes;
      this.dismissLoading();
    }, error => {
      console.error('Recipe typed search subscription error:', error);
      this.dismissLoading();
    });
  }

  /**
   * Handles the search bar input change.
   * Calls the appropriate search method based on the selected segment.
   * This is primarily for *user typing*.
   * @param event The ionChange event object from the searchbar.
   */
  async onSearchChange(event: any) {
    const query = event.detail.value;

    if (this.selectedSegment === 'users') {
      this.searchTerm = query;
      // If the query is empty, treat it as an initial load (or clear search)
      if (query.trim() === '') {
        this.fetchUsersInitial();
      } else if (this.currentUser) { // Only trigger typed search if logged in and query is not empty
        await this.presentLoading('Searching chefs...');
        this.searchSubject.next(query); // Emit to the typed search subject
      }
    } else if (this.selectedSegment === 'recipes') {
      this.recipeSearchTerm = query;
      // If the query is empty, treat it as an initial load (or clear search)
      if (query.trim() === '') {
        this.fetchRecipesInitial();
      } else { // Query is not empty, perform typed search
        await this.presentLoading('Searching recipes...');
        this.recipeSearchSubject.next(query); // Emit to the typed search subject
      }
    }
  }

  /**
   * Fetches initial list of users (top followed) if a user is logged in.
   * This is a direct API call, bypassing the Subject/debounce pipeline.
   */
  async fetchUsersInitial() {
    if (!this.currentUser) {
      this.foundUsers = [];
      return;
    }

    await this.presentLoading('Loading chefs...');
    this.userService.getTopFollowedUsers().pipe(
      // Apply following check directly to this observable too
      switchMap((users: SimpleUser[]) => {
          if (this.currentUserId) {
              return this.userService.getUserFollowing(this.currentUserId).pipe(
                  map((followingList: SimpleUser[]) => {
                      const followingIds = new Set(followingList.map((f: SimpleUser) => f._id));
                      return users.map(user => ({
                          ...user,
                          isFollowing: followingIds.has(user._id)
                      }));
                  }),
                  catchError((err: any) => {
                      console.error('Error fetching following list for initial users:', err);
                      this.presentToast('Failed to check following status.', 'danger');
                      return of(users.map(user => ({ ...user, isFollowing: false })));
                  })
              );
          }
          return of(users.map(user => ({ ...user, isFollowing: false })));
      }),
      catchError((err: any) => {
        console.error('Error fetching initial users:', err);
        this.presentToast(err.message || 'Failed to load chefs.', 'danger');
        return of<SimpleUser[]>([]);
      })
    ).subscribe(users => {
      this.foundUsers = users.filter(user => user._id !== this.currentUserId);
      this.dismissLoading();
    }, error => {
      console.error('Initial user fetch subscription error:', error);
      this.dismissLoading();
    });
  }

  /**
   * Fetches initial list of recipes (public recipes).
   * This is a direct API call, bypassing the Subject/debounce pipeline.
   */
  async fetchRecipesInitial() {
    await this.presentLoading('Loading recipes...');
    this.recipeService.getPublicRecipes().pipe(
      catchError((err: any) => {
        console.error('Error fetching initial recipes:', err);
        this.presentToast(err.message || 'Failed to load recipes.', 'danger');
        return of<Recipe[]>([]);
      })
    ).subscribe(recipes => {
      this.foundRecipes = recipes;
      this.dismissLoading();
    }, error => {
      console.error('Initial recipe fetch subscription error:', error);
      this.dismissLoading();
    });
  }

  async toggleFollow(targetUser: SimpleUser) {
    if (!this.currentUserId) {
      await this.presentToast('Please log in to follow users.', 'warning');
      return;
    }

    console.log('Attempting to toggle follow for:', targetUser.name, 'ID:', targetUser._id, 'Current isFollowing:', targetUser.isFollowing);

    const loading = await this.loadingController.create({
      message: targetUser.isFollowing ? 'Unfollowing...' : 'Following...',
      duration: 5000
    });
    await loading.present();

    try {
      const response = await this.userService.toggleFollow(targetUser._id).toPromise();
      console.log('API Response for toggleFollow:', response);

      if (response) {
        targetUser.isFollowing = response.isFollowing;
        targetUser.followersCount = response.targetUserFollowersCount;
        console.log('UPDATED UI for user:', targetUser.name, 'New isFollowing:', targetUser.isFollowing, 'New followersCount:', targetUser.followersCount);
        await this.presentToast(response.message, 'success');
      } else {
          console.warn('Toggle follow received no response or empty response. UI not updated.');
          await this.presentToast('Failed to get a clear response from server.', 'danger');
      }
    } catch (err: any) {
      console.error('Error toggling follow:', err);
      await this.presentToast(err.message || 'Failed to toggle follow status.', 'danger');
    } finally {
      await loading.dismiss().catch(e => console.error('Error dismissing loading:', e));
    }
  }

  async presentLoading(message: string = 'Loading...') {
    // if (this.loading) {
    //   await this.loading.dismiss().catch(e => console.error('Error dismissing old loading:', e));
    //   this.loading = null;
    // }
    // this.loading = await this.loadingController.create({
    //   message: message,
    // });
    // await this.loading.present();
  }

  async dismissLoading() {
    if (this.loading) {
      await this.loading.dismiss().catch(e => console.error('Error dismissing loading:', e));
      this.loading = null;
    }
  }

  async presentToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    toast.present();
  }
}