// src/app/pages/user-profile/user-profile.page.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LoadingController,
  ToastController,
  NavController,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonTitle,
  IonContent,
  IonAvatar,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonText,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
} from '@ionic/angular/standalone';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { arrowBackOutline, addOutline, removeOutline, heartOutline, heartSharp, bookmarkOutline, bookmarkSharp } from 'ionicons/icons';

import { UserService, SimpleUser } from '../../services/user';
import { AuthService, UserProfile as CurrentUserProfile, AuthResponse } from '../../services/auth';
import { RecipeService, Recipe } from '../../services/recipe';

import { Subscription, Observable, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.page.html',
  styleUrls: ['./user-profile.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonTitle,
    IonContent,
    IonAvatar,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonText,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonBadge,
  ],
})
export class UserProfilePage implements OnInit, OnDestroy {
  targetUserId: string | null = null;
  userProfile: SimpleUser | null = null;
  userRecipes: Recipe[] = [];
  currentUser: AuthResponse | null = null;
  isOwner: boolean = false;
  private authSubscription: Subscription = new Subscription();
  public loading: HTMLIonLoadingElement | null = null; // FIXED: Changed to public
  private paramMapSubscription: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private authService: AuthService,
    private recipeService: RecipeService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private navController: NavController,
    private router: Router
  ) {
    addIcons({ arrowBackOutline, addOutline, removeOutline, heartOutline, heartSharp, bookmarkOutline, bookmarkSharp });

    console.log('UserProfilePage: Constructor called.');

    this.authSubscription = this.authService.user.subscribe(user => {
      this.currentUser = user;
      console.log('UserProfilePage: AuthService user subscription update. Current User:', user ? user._id : 'null');
      if (!user) {
        console.log('UserProfilePage: User logged out. Redirecting to login.');
        if (this.router.url !== '/login') {
          this.router.navigateByUrl('/login');
        }
      } else {
        if (this.targetUserId) {
          console.log('UserProfilePage: Both currentUser and targetUserId available. Triggering loadProfileData from authSubscription.');
          this.loadProfileData();
        } else {
          console.log('UserProfilePage: CurrentUser available, but targetUserId not yet. Waiting for paramMap.');
        }
      }
    });
  }

  ngOnInit() {
    console.log('UserProfilePage: ngOnInit called.');
    this.paramMapSubscription = this.route.paramMap.subscribe(params => {
      const newTargetUserId = params.get('id');
      if (this.targetUserId !== newTargetUserId) {
        this.targetUserId = newTargetUserId;
        console.log('UserProfilePage: paramMap subscription update. Target User ID:', this.targetUserId);

        if (this.targetUserId && this.currentUser) {
          console.log('UserProfilePage: Both targetUserId and currentUser available. Triggering loadProfileData from paramMap.');
          this.loadProfileData();
        } else if (!this.currentUser) {
          console.log('UserProfilePage: TargetUserId available, but currentUser not yet. Waiting for authService.');
        } else if (!this.targetUserId) {
          console.error('UserProfilePage Error: paramMap gave null/empty ID. Navigating back.');
          this.presentToast('Invalid profile ID.', 'danger');
          this.navController.back();
        }
      }
    });
  }

  ngOnDestroy() {
    console.log('UserProfilePage: ngOnDestroy called.');
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    if (this.paramMapSubscription) {
      this.paramMapSubscription.unsubscribe();
    }
    if (this.loading) {
      this.loading.dismiss().catch((e: any) => console.error('Error dismissing loading on destroy:', e));
      this.loading = null;
    }
  }

  async loadProfileData() {
    console.log('UserProfilePage: loadProfileData execution started. targetUserId:', this.targetUserId, 'currentUser:', this.currentUser?._id);

    if (!this.targetUserId || !this.currentUser) {
      console.error('UserProfilePage Critical Error: loadProfileData called without required IDs.');
      await this.presentToast('Profile ID or authentication missing for load.', 'danger');
      await this.dismissLoading();
      return;
    }

    this.isOwner = this.targetUserId === this.currentUser._id;
    console.log('UserProfilePage: Is owner:', this.isOwner);

    await this.presentLoading();

    try {
      // Define the base requests with their specific types
      const profileRequest: Observable<SimpleUser> = this.userService.getUserProfile(this.targetUserId);
      const recipesRequest: Observable<Recipe[]> = this.userService.getRecipesForUser(this.targetUserId);

      // Dynamically build the array of observables for forkJoin, explicitly typed
      let allRequests: Observable<any>[] = [profileRequest, recipesRequest];

      // Keep track of the following request observable separately for type inference later
      let followingRequestObservable: Observable<SimpleUser[]> | null = null;
      if (!this.isOwner) {
        followingRequestObservable = this.userService.getUserFollowing(this.currentUser._id);
        allRequests.push(followingRequestObservable);
      }

      // Use forkJoin to get all results at once
      const results = await forkJoin(allRequests).toPromise();

      if (!results || results.length === 0) {
          console.warn('UserProfilePage: forkJoin returned no results or empty array.');
          throw new Error('Failed to load profile data due to empty API response.');
      }

      // Explicitly cast each element based on its expected type and position
      const profile: SimpleUser = results[0] as SimpleUser;
      const recipes: Recipe[] = results[1] as Recipe[];

      let followingList: SimpleUser[] = [];
      if (!this.isOwner && followingRequestObservable) {
          followingList = results[2] as SimpleUser[];
      }

      if (profile) {
        this.userProfile = profile;
        console.log('UserProfilePage: Fetched profile data:', this.userProfile);

        if (!this.isOwner && this.userProfile) {
            this.userProfile.isFollowing = followingList.some(f => f._id === this.targetUserId);
            console.log('UserProfilePage: isFollowing status set to:', this.userProfile.isFollowing);
        } else if (this.userProfile) {
            this.userProfile.isFollowing = false;
        }

      } else {
        console.warn('UserProfilePage: User profile data is empty.');
        throw new Error('User profile not found or empty response.');
      }

      if (recipes) {
        this.userRecipes = recipes;
        console.log('UserProfilePage: Fetched recipes count:', this.userRecipes.length);
      } else {
        console.warn('UserProfilePage: User recipes data is empty.');
        this.userRecipes = [];
      }

    } catch (err: any) {
      console.error('UserProfilePage: API Error during profile/recipes fetch:', err);
      await this.presentToast(err.message || 'Failed to load profile data due to API error.', 'danger');
    } finally {
      await this.dismissLoading();
      console.log('UserProfilePage: loadProfileData execution finished.');
    }
  }

  async toggleFollow() {
    console.log('UserProfilePage: toggleFollow called.');
    if (!this.targetUserId || !this.currentUser) {
      await this.presentToast('Please log in to follow users.', 'warning');
      return;
    }
    if (this.targetUserId === this.currentUser._id) {
        await this.presentToast('You cannot follow yourself.', 'warning');
        return;
    }

    const loadingMsg = this.userProfile?.isFollowing ? 'Unfollowing...' : 'Following...';
    const toggleFollowLoading = await this.loadingController.create({
      message: loadingMsg,
      duration: 5000
    });
    await toggleFollowLoading.present();

    try {
      const response = await this.userService.toggleFollow(this.targetUserId).toPromise();
      if (response && this.userProfile) {
        this.userProfile.isFollowing = response.isFollowing;
        this.userProfile.followersCount = response.targetUserFollowersCount;
        await this.presentToast(response.message, 'success');
      }
    } catch (err: any) {
      console.error('UserProfilePage: Error toggling follow:', err);
      await this.presentToast(err.message || 'Failed to toggle follow status.', 'danger');
    } finally {
      if (toggleFollowLoading) {
        await toggleFollowLoading.dismiss().catch((e: any) => console.error('Error dismissing toggleFollowLoading:', e));
      }
    }
  }

  async toggleLike(recipe: Recipe) {
    console.log('UserProfilePage: toggleLike called.');
    if (!this.currentUser) {
      await this.presentToast('Please log in to like recipes.', 'warning');
      return;
    }
    try {
      const response = await this.recipeService.toggleLike(recipe._id!).toPromise();
      if (response) {
        if (response.message.includes('unliked')) {
          recipe.likes = recipe.likes.filter(id => id !== this.currentUser?._id);
          recipe._hasLiked = false;
        } else {
          recipe.likes.push(this.currentUser._id);
          recipe._hasLiked = true;
        }
        await this.presentToast(response.message, 'success');
      }
    } catch (err: any) {
      console.error('UserProfilePage: Error toggling like:', err);
      await this.presentToast(err.message || 'Failed to toggle like.', 'danger');
    }
  }

  async toggleSave(recipe: Recipe) {
    console.log('UserProfilePage: toggleSave called.');
    if (!this.currentUser) {
      await this.presentToast('Please log in to save recipes.', 'warning');
      return;
    }

    const toggleSaveLoading = await this.loadingController.create({
      message: recipe._isSaved ? 'Removing from saved...' : 'Saving recipe...',
      duration: 5000
    });
    await toggleSaveLoading.present();

    try {
      const response = await this.recipeService.toggleSave(recipe._id!).toPromise();
      if (response) {
        recipe._isSaved = response.saved;
        await this.presentToast(response.message, 'success');
      }
    } catch (err: any) {
      console.error('UserProfilePage: Error toggling save:', err);
      await this.presentToast(err.message || 'Failed to toggle save.', 'danger');
    } finally {
      if (toggleSaveLoading) {
        await toggleSaveLoading.dismiss().catch((e: any) => console.error('Error dismissing toggleSaveLoading:', e));
      }
    }
  }

  goBack() {
    console.log('UserProfilePage: goBack called.');
    this.navController.back();
  }

  async presentLoading() {
    if (this.loading) {
      await this.loading.dismiss().catch((e: any) => console.error('Error dismissing old loading:', e));
    }
    this.loading = await this.loadingController.create({
      message: 'Loading profile...',
      duration: 10000
    });
    await this.loading.present();
  }

  async dismissLoading() {
    if (this.loading) {
      await this.loading.dismiss().catch((e: any) => console.error('Error dismissing loading:', e));
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