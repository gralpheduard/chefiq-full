// src/app/tab1/tab1.page.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import {
  // LoadingController, // REMOVED
  ToastController,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonText,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonButtons,
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { logOutOutline, heartOutline, heartSharp, bookmarkOutline, bookmarkSharp, searchOutline } from 'ionicons/icons';

import { AuthService, UserProfile } from '../services/auth';
import { RecipeService, Recipe } from '../services/recipe';
import { UserService, SimpleUser } from '../services/user';

import { Subscription, of, Observable } from 'rxjs';
import { map, catchError, first } from 'rxjs/operators';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonText,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonCardContent,
    IonBadge,
    IonButtons,
  ]
})
export class Tab1Page implements OnInit, OnDestroy {
  currentUser: UserProfile | null = null;
  hasFollowing: boolean = false;
  hasFollowers: boolean = false;
  publicRecipes: Recipe[] = [];
  private userSubscription: Subscription;
  private currentUserId: string | null = null;
  // private loading: HTMLIonLoadingElement | null = null; // REMOVED

  constructor(
    private authService: AuthService,
    private recipeService: RecipeService,
    private userService: UserService,
    private router: Router,
    // private loadingController: LoadingController, // REMOVED
    private toastController: ToastController,
  ) {
    addIcons({ logOutOutline, heartOutline, heartSharp, bookmarkOutline, bookmarkSharp, searchOutline });

    this.userSubscription = this.authService.user.subscribe((user: UserProfile | null) => {
      this.currentUser = user;
      if (user) {
        this.currentUserId = user._id;
        console.log('[Tab1] AuthService user subscription: User logged in, fetching dashboard data.');
        this.fetchDashboardData();
      } else {
        this.currentUserId = null;
        this.publicRecipes = [];
        this.hasFollowing = false;
        this.hasFollowers = false;
        console.log('[Tab1] AuthService user subscription: User logged out/no user, navigating to login if not already there.');
        if (this.router.url !== '/login') {
            this.router.navigateByUrl('/login');
        }
      }
    });
  }

  ngOnInit() {
    console.log('[Tab1] ngOnInit: currentUser exists?', !!this.currentUser);
    if (this.currentUser) {
      this.fetchDashboardData();
    }
  }

  ionViewWillEnter() {
    console.log('[Tab1] ionViewWillEnter: currentUser exists?', !!this.currentUser, 'currentUserId:', this.currentUserId);
    if (this.currentUser && this.currentUserId) {
        this.fetchDashboardData();
    }
  }

  ngOnDestroy() {
    console.log('[Tab1] ngOnDestroy: Unsubscribing user subscription.');
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    // No loading to dismiss here as it's removed
  }

  async fetchDashboardData() {
    console.log('[Tab1] fetchDashboardData: Starting...');
    // Removed loading spinner logic

    try {
      console.log('[Tab1] fetchDashboardData: Attempting to get user profile (authService.getMe())...');
      const userProfile = await this.authService.getMe().pipe(first()).toPromise();
      console.log('[Tab1] fetchDashboardData: authService.getMe() resolved, userProfile:', userProfile ? userProfile._id : 'null');

      if (userProfile) {
        this.currentUser = userProfile;
        this.currentUserId = userProfile._id;
        console.log('[Tab1] fetchDashboardData: User profile updated, ID:', this.currentUserId);

        console.log('[Tab1] fetchDashboardData: Fetching following, followers, and public recipes concurrently...');
        const [followingResult, followersResult, publicRecipesResult] = await Promise.allSettled([
          this.checkFollowingStatus(),
          this.checkFollowersStatus(),
          this.fetchPublicRecipes()
        ]);

        if (followingResult.status === 'rejected') console.error('[Tab1] Error in checkFollowingStatus:', followingResult.reason);
        if (followersResult.status === 'rejected') console.error('[Tab1] Error in checkFollowersStatus:', followersResult.reason);
        if (publicRecipesResult.status === 'rejected') console.error('[Tab1] Error in fetchPublicRecipes:', publicRecipesResult.reason);
        console.log('[Tab1] fetchDashboardData: All concurrent data fetches completed (Promise.allSettled).');

      } else {
        console.log('[Tab1] fetchDashboardData: User profile data is empty or invalid, throwing error.');
        throw new Error('User profile data is empty or invalid.');
      }
    } catch (err: any) {
      console.error("[Tab1] Critical error fetching dashboard data (catch block):", err);
      this.currentUserId = null;
      await this.presentToast(err.message || 'Failed to load dashboard. Session expired.', 'danger');
      this.authService.logout();
    } finally {
      console.log('[Tab1] fetchDashboardData: Finally block entered.');
      // No loading to dismiss here as it's removed
    }
  }

  async checkFollowingStatus() {
    console.log('[Tab1] checkFollowingStatus: Starting...');
    if (!this.currentUserId) {
        this.hasFollowing = false;
        console.log('[Tab1] checkFollowingStatus: No currentUserId, setting hasFollowing to false.');
        return;
    }
    try {
      const following = await this.userService.getUserFollowing(this.currentUserId).pipe(first()).toPromise();
      this.hasFollowing = (following?.length || 0) > 0;
      console.log('[Tab1] checkFollowingStatus: Resolved. Has following:', this.hasFollowing);
    } catch (err) {
      console.error('[Tab1] checkFollowingStatus: Error fetching following list:', err);
      this.hasFollowing = false;
      throw err;
    }
  }

  async checkFollowersStatus() {
    console.log('[Tab1] checkFollowersStatus: Starting...');
    if (!this.currentUserId) {
        this.hasFollowers = false;
        console.log('[Tab1] checkFollowersStatus: No currentUserId, setting hasFollowers to false.');
        return;
    }
    try {
      const followers = await this.userService.getUserFollowers(this.currentUserId).pipe(first()).toPromise();
      this.hasFollowers = (followers?.length || 0) > 0;
      console.log('[Tab1] checkFollowersStatus: Resolved. Has followers:', this.hasFollowers);
    } catch (err) {
      console.error('[Tab1] checkFollowersStatus: Error fetching followers list:', err);
      this.hasFollowers = false;
      throw err;
    }
  }

async fetchPublicRecipes() {
    console.log('[Tab1] fetchPublicRecipes: Starting...');
    try {
        const publicRecipesObservable: Observable<Recipe[]> = this.recipeService.getPublicRecipes().pipe(
            map(recipes => recipes || []),
            catchError((err) => {
                console.error('[Tab1] fetchPublicRecipes: Error fetching public recipes:', err);
                return of([]);
            }),
            first()
        );

        // This now calls the NEW backend endpoint you just created
        const savedRecipesObservable: Observable<Recipe[]> = this.currentUserId ? this.recipeService.getSavedRecipes().pipe(
            map(recipes => recipes || []),
            catchError((err) => {
                console.error('[Tab1] fetchPublicRecipes: Error fetching saved recipes:', err);
                return of([]);
            }),
            first()
        ) : of([]);

        // (Keep likedRecipesObservable as is)
        const likedRecipesObservable: Observable<Recipe[]> = this.currentUserId ? this.recipeService.getLikedRecipes().pipe(
            map(recipes => recipes || []),
            catchError((err) => {
                console.error('[Tab1] fetchPublicRecipes: Error fetching liked recipes:', err);
                return of([]);
            }),
            first()
        ) : of([]);


        const [fetchedPublicRecipes, savedRecipes, likedRecipes] = await Promise.all([
            publicRecipesObservable.toPromise(),
            savedRecipesObservable.toPromise(),
            likedRecipesObservable.toPromise()
        ]) as [Recipe[], Recipe[], Recipe[]];
        console.log('[Tab1] fetchPublicRecipes: All recipe-related fetches completed.');
console.log('[Tab1] Fetched savedRecipes array:', savedRecipes); // <-- ADD THIS TEMPORARY LOG
console.log('[Tab1] currentUserId:', this.currentUserId); // <-- ADD THIS TEMPORARY LOG
        // Correctly derive savedRecipeIds from the actual saved recipes list
        const savedRecipeIds = new Set(savedRecipes.map(r => r._id!)); // Use '!' for non-null assertion if confident
        const likedRecipeIds = new Set(likedRecipes.map(r => r._id!)); // Use '!' for non-null assertion if confident
console.log('[Tab1] Derived savedRecipeIds Set:', savedRecipeIds);
        if (fetchedPublicRecipes) {
            this.publicRecipes = fetchedPublicRecipes.map((recipe: Recipe) => {
                return {
                    ...recipe,
                    // Determine _hasLiked by checking if the current user ID is in the recipe's likes array
                    _hasLiked: recipe.likes?.includes(this.currentUserId!),
                    // Determine _isSaved by checking if the recipe's ID is in the set of saved recipe IDs
                    _isSaved: savedRecipeIds.has(recipe._id!)
                };
            });
            console.log('[Tab1] fetchPublicRecipes: Public recipes processed, count:', this.publicRecipes.length);
        } else {
            this.publicRecipes = [];
            console.log('[Tab1] fetchPublicRecipes: No public recipes fetched.');
        }
    } catch (err: any) {
        console.error('[Tab1] fetchPublicRecipes: Overall error in fetching public recipes or user status:', err);
        this.publicRecipes = [];
        throw err;
    }
}

 async toggleLike(recipe: Recipe, event: Event) {
  event.stopPropagation();
  if (!this.currentUserId) {
    await this.presentToast('Please log in to like recipes.', 'warning');
    return;
  }
  try {
    const response = await this.recipeService.toggleLike(recipe._id!).pipe(first()).toPromise();

    if (response) {
      if (response.message.includes('unliked')) {
        recipe.likes = recipe.likes.filter(id => id !== this.currentUserId);
        recipe._hasLiked = false;
      } else {
        if (!recipe.likes.includes(this.currentUserId)) {
          recipe.likes.push(this.currentUserId);
        }
        recipe._hasLiked = true;
      }
      await this.presentToast(response.message, 'success');
    }
  } catch (err: any) {
    console.error('[Tab1] Error toggling like:', err);
    await this.presentToast(err.message || 'Failed to toggle like.', 'danger');
  }
}


async toggleSave(recipe: Recipe, event: Event) {
  event.stopPropagation();
  if (!this.currentUserId) {
    await this.presentToast('Please log in to save recipes.', 'warning');
    return;
  }
  try {
    const response = await this.recipeService.toggleSave(recipe._id!).pipe(first()).toPromise();
    if (response) {
      recipe._isSaved = response.saved;
      await this.presentToast(response.message, 'success');
    }
  } catch (err: any) {
    console.error('[Tab1] Error toggling save:', err);
    await this.presentToast(err.message || 'Failed to toggle save.', 'danger');
  }
}


  navigateToSearchUsers() {
    this.router.navigateByUrl('/tabs/tab3');
  }

  onLogout() {
    console.log('[Tab1] onLogout: Initiating logout.');
    this.authService.logout();
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

 logRecipeId(id: string) { // It expects a string
    console.log('Attempting to view recipe with ID:', id);
  }

  goToRecipeDetail(id: string | undefined) {
  this.router.navigate(['/recipe-detail', id]);
}

}