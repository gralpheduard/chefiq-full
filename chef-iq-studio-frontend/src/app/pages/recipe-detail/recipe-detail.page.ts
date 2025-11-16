// C:\Users\Ralph Gannaban\Desktop\dev\sideline\chefiq\frontend\src\app\pages\recipe-detail\recipe-detail.page.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonLabel, IonText,
  IonButtons, IonBackButton, IonButton, IonIcon, IonList, IonCard,
  IonCardHeader, IonCardTitle, IonCardContent, ToastController, LoadingController, AlertController,
  IonChip,
  // IonCardSubtitle, // REMOVED: Unused import
  IonAvatar,
  IonBadge
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import {
  createOutline, trashOutline, cameraOutline, videocamOutline, hardwareChipOutline,
  lockClosedOutline, peopleOutline, globeOutline,
  heartOutline, heartSharp, bookmarkOutline, bookmarkSharp,
  listOutline, restaurantOutline // ADDED: restaurantOutline
} from 'ionicons/icons';

import { RecipeService, Recipe } from '../../services/recipe';
import { AuthService, UserProfile } from '../../services/auth';
import { Subscription, forkJoin, of, Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-recipe-detail',
  templateUrl: './recipe-detail.page.html',
  styleUrls: ['./recipe-detail.page.scss'],
  standalone: true,
  imports: [
    RouterModule,
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonLabel, IonText,
    IonButtons, IonBackButton, IonButton, IonIcon, IonList,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonChip,
    // IonCardSubtitle, // REMOVED: Unused import
    IonAvatar,
    IonBadge
  ]
})
export class RecipeDetailPage implements OnInit, OnDestroy {
  recipe: Recipe | null = null;
  recipeId: string | null = null;
  currentUser: UserProfile | null = null;
  private authSubscription: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recipeService: RecipeService,
    private authService: AuthService,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) {
    addIcons({
      createOutline, trashOutline, cameraOutline, videocamOutline, hardwareChipOutline,
      lockClosedOutline, peopleOutline, globeOutline,
      heartOutline, heartSharp, bookmarkOutline, bookmarkSharp,
      listOutline, restaurantOutline // ADDED: restaurantOutline
    });
  }

  ngOnInit() {
    this.authSubscription = this.authService.user.subscribe(user => {
      this.currentUser = user;
      if (this.recipeId) { // Only reload if recipeId is already set
        this.loadRecipeDetails(this.recipeId);
      }
    });

    this.recipeId = this.route.snapshot.paramMap.get('id');
    if (this.recipeId) {
      this.loadRecipeDetails(this.recipeId);
    } else {
      this.presentToast('No recipe ID provided.', 'danger');
      this.router.navigateByUrl('/tabs/cookbook');
    }
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  async loadRecipeDetails(id: string) {
    const loading = await this.loadingController.create({ message: 'Loading recipe details...' });
    await loading.present();

    try {
      const recipeObservable: Observable<Recipe> = this.recipeService.getRecipeById(id);

      let savedRecipesObservable: Observable<Recipe[]> = of([]);
      let likedRecipesObservable: Observable<Recipe[]> = of([]);

      if (this.currentUser) {
        savedRecipesObservable = this.recipeService.getSavedRecipes().pipe(
          catchError((err) => {
            console.error('Error fetching user saved recipes:', err);
            return of([]);
          })
        );
        likedRecipesObservable = this.recipeService.getLikedRecipes().pipe(
          catchError((err) => {
            console.error('Error fetching user liked recipes:', err);
            return of([]);
          })
        );
      }

      // Use forkJoin with explicit array type for clarity and strictness
      const results: [Recipe, Recipe[], Recipe[]] = await forkJoin([
        recipeObservable,
        savedRecipesObservable,
        likedRecipesObservable
      ]).toPromise() as [Recipe, Recipe[], Recipe[]]; // Explicitly cast the result of toPromise

      const [fetchedRecipe, savedRecipes, likedRecipes] = results;

      if (fetchedRecipe) {
        this.recipe = fetchedRecipe;

        if (this.currentUser && this.recipe) { // Ensure this.recipe is not null here
          this.recipe._isSaved = savedRecipes.some((r: Recipe) => r._id === this.recipe!._id);
          this.recipe._hasLiked = likedRecipes.some((r: Recipe) => r._id === this.recipe!._id);
        } else if (this.recipe) { // If no currentUser, set flags to false
          this.recipe._isSaved = false;
          this.recipe._hasLiked = false;
        }

        console.log('Recipe Details Loaded:', this.recipe);
        console.log('  Main Image URL:', this.recipe.mainImage);

      } else {
        throw new Error('Recipe data not found.');
      }
    } catch (error: any) {
      console.error('Error loading recipe details:', error);
      this.presentToast(error.message || 'Failed to load recipe details.', 'danger');
      this.router.navigateByUrl('/tabs/cookbook');
    } finally {
      await loading.dismiss();
    }
  }

  async onDeleteRecipe() {
    // Check if recipe is defined and current user is the owner
    // Also ensuring recipe.user exists before checking its _id
    if (!this.recipe || !this.currentUser || !this.recipe.user || this.recipe.user._id !== this.currentUser._id) {
        await this.presentToast('You can only delete your own recipes.', 'warning');
        return;
    }

    const alert = await this.alertController.create({
      header: 'Confirm Delete',
      message: 'Are you sure you want to delete this recipe? This cannot be undone.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Delete',
          handler: async () => {
            const loading = await this.loadingController.create({ message: 'Deleting recipe...' });
            await loading.present();
            try {
              await this.recipeService.deleteRecipe(this.recipe!._id!).toPromise(); // Use non-null assertion for _id
              await loading.dismiss();
              this.presentToast('Recipe deleted successfully.', 'success');
              this.router.navigateByUrl('/tabs/cookbook');
            } catch (error: any) {
              await loading.dismiss();
              console.error('Error deleting recipe:', error);
              this.presentToast(error.message || 'Failed to delete recipe.', 'danger');
            }
          },
        },
      ],
    });
    await alert.present();
  }

  // NEW: Method to navigate to Cook Mode
 onCookNow(recipeId: string) {
    console.log('Cook Now button clicked. Recipe ID:', recipeId); // ADD THIS LOG
    if (!recipeId) {
      this.presentToast('Cannot start cooking, recipe ID is missing.', 'danger');
      console.error('onCookNow: Recipe ID is missing!'); // ADD THIS ERROR LOG
      return;
    }
    this.router.navigateByUrl(`/cook-recipe/${recipeId}`);
    console.log('Attempting to navigate to:', `/cook-recipe/${recipeId}`); // ADD THIS LOG
  }

  async toggleLike(recipe: Recipe) {
    if (!this.currentUser) {
      await this.presentToast('Please log in to like recipes.', 'warning');
      return;
    }
    // Ensure this.recipe is not null before proceeding with UI update
    if (!this.recipe || !recipe._id || !this.currentUser._id) {
        console.error('Recipe or user ID missing for like toggle.');
        return;
    }

    try {
      const response = await this.recipeService.toggleLike(recipe._id).toPromise(); // Use non-null recipe._id here
      if (response && this.recipe) {
        if (response.likesCount !== undefined) { // Check if likesCount is provided in the response
          // A more robust way: backend should return the updated 'likes' array or new count
          // For now, based on your current backend response for toggleLike (likesCount), update directly
          if (this.recipe.likes) { // Ensure likes array exists
            const currentUserId = this.currentUser._id;
            if (this.recipe._hasLiked) {
                this.recipe.likes = this.recipe.likes.filter(id => id !== currentUserId);
            } else {
                if (!this.recipe.likes.includes(currentUserId)) {
                  this.recipe.likes.push(currentUserId);
                }
            }
          }
          this.recipe._hasLiked = !this.recipe._hasLiked; // Toggle the client-side flag
        } else { // Fallback if backend doesn't send likesCount, rely on message for status change
            if (response.message.includes('unliked')) {
                this.recipe.likes = this.recipe.likes.filter(id => id !== this.currentUser!._id);
                this.recipe._hasLiked = false;
            } else {
                if (!this.recipe.likes.includes(this.currentUser!._id)) {
                  this.recipe.likes.push(this.currentUser!._id);
                }
                this.recipe._hasLiked = true;
            }
        }
        await this.presentToast(response.message, 'success');
      }
    } catch (err: any) {
      console.error('Error toggling like:', err);
      await this.presentToast(err.message || 'Failed to toggle like.', 'danger');
    }
  }

  async toggleSave(recipe: Recipe) {
    if (!this.currentUser) {
      await this.presentToast('Please log in to save recipes.', 'warning');
      return;
    }
    // Ensure this.recipe is not null before proceeding
    if (!this.recipe || !recipe._id) {
        console.error('Recipe ID missing for save toggle.');
        return;
    }

    const toggleSaveLoading = await this.loadingController.create({
      message: recipe._isSaved ? 'Removing from saved...' : 'Saving recipe...',
      duration: 5000
    });
    await toggleSaveLoading.present();

    try {
      const response = await this.recipeService.toggleSave(recipe._id).toPromise(); // Use non-null recipe._id here
      if (response && this.recipe) { // Ensure this.recipe is not null when updating
        this.recipe._isSaved = response.saved;
        await this.presentToast(response.message, 'success');
      }
    } catch (err: any) {
      console.error('Error toggling save:', err);
      await this.presentToast(err.message || 'Failed to toggle save.', 'danger');
    } finally {
      if (toggleSaveLoading) {
        await toggleSaveLoading.dismiss().catch((e: any) => console.error('Error dismissing toggleSaveLoading:', e));
      }
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

  getPrivacyColor(privacy: string): string {
    switch (privacy) {
      case 'public': return 'success';
      case 'friends': return 'primary';
      case 'private': return 'warning';
      // case 'followers': return 'tertiary'; // If you add 'followers' to privacy options
      default: return 'medium';
    }
  }

  getPrivacyIcon(privacy: string): string {
    switch (privacy) {
      case 'public': return 'globe-outline';
      case 'friends': return 'people-outline';
      case 'private': return 'lock-closed-outline';
      // case 'followers': return 'person-add-outline'; // If you add 'followers' to privacy options
      default: return 'help-circle-outline';
    }
  }
}