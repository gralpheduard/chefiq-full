import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import {
  LoadingController,
  ToastController,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonText,
  IonLoading,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  AlertController,
  // IonChip, // <-- REMOVED: This component is not directly used in dashboard.page.html
  IonButtons,
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common'; // <-- Import CommonModule for *ngIf, *ngFor, and pipes
import { addIcons } from 'ionicons';
import { createOutline, trashOutline, eyeOutline, addOutline, checkmarkCircleOutline } from 'ionicons/icons';

// --- IMPORTANT: CORRECTED SERVICE IMPORT PATHS ---
import { AuthService, UserProfile } from '../../services/auth'; // <-- Changed to '../../services/auth'
import { RecipeService, Recipe } from '../../services/recipe'; // <-- Changed to '../../services/recipe'
// --- END IMPORTANT CHANGES ---

import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule,     // Essential for *ngIf, *ngFor, TitleCasePipe
    RouterModule,     // Essential for routerLink
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonText,
    IonLoading,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    // IonChip, // <-- REMOVED from imports
    IonButtons,
  ]
})
export class DashboardPage implements OnInit, OnDestroy {
  currentUser: UserProfile | null = null;
  userRecipes: Recipe[] = [];
  private userSubscription: Subscription;

  constructor(
    private authService: AuthService,
    private recipeService: RecipeService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    addIcons({ createOutline, trashOutline, eyeOutline, addOutline, checkmarkCircleOutline });

    // --- IMPORTANT: EXPLICITLY TYPED 'user' PARAMETER ---
    this.userSubscription = this.authService.user.subscribe((user: UserProfile | null) => {
      if (!user) {
        this.currentUser = null;
      }
    });
  }

  ngOnInit() {
    this.fetchUserProfile();
    this.fetchUserRecipes();
  }

  ngOnDestroy() {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  async fetchUserProfile() {
    const loading = await this.loadingController.create({
      message: 'Loading user data...',
    });
    // await loading.present();

    try {
      const userProfile = await this.authService.getMe().toPromise();
      if (userProfile) {
        this.currentUser = userProfile;
      } else {
        throw new Error('User profile data is empty or invalid.');
      }
    } catch (err: any) {
      console.error("Error fetching user profile:", err);
      await this.presentToast(err.message || 'Failed to fetch user profile. Session expired.', 'danger');
      this.authService.logout();
      this.router.navigateByUrl('/login');
    } finally {
      await loading.dismiss();
    }
  }

  async fetchUserRecipes() {
    const loading = await this.loadingController.create({
      message: 'Loading your recipes...',
    });
    await loading.present();

    try {
      const recipes = await this.recipeService.getUserRecipes().toPromise();
      this.userRecipes = recipes || [];
    } catch (error: any) {
      console.error('Error fetching recipes:', error);
      this.presentToast(error.message || 'Failed to load your recipes.', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  async onDeleteRecipe(recipeId: string) {
    const alert = await this.alertController.create({
      header: 'Confirm Delete',
      message: 'Are you sure you want to delete this recipe? This cannot be undone.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          handler: async () => {
            const loading = await this.loadingController.create({ message: 'Deleting recipe...' });
            await loading.present();
            try {
              await this.recipeService.deleteRecipe(recipeId).toPromise();
              await loading.dismiss();
              this.presentToast('Recipe deleted successfully.', 'success');
              this.fetchUserRecipes();
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

  async onPublishRecipe(recipeId: string) {
    const loading = await this.loadingController.create({ message: 'Publishing recipe...' });
    await loading.present();
    try {
      await this.recipeService.publishRecipe(recipeId).toPromise();
      await loading.dismiss();
      this.presentToast('Recipe submitted for review!', 'success');
      this.fetchUserRecipes();
    } catch (error: any) {
      await loading.dismiss();
      console.error('Error publishing recipe:', error);
      this.presentToast(error.message || 'Failed to publish recipe.', 'danger');
    }
  }

  onLogout() {
    this.authService.logout();
    this.router.navigateByUrl('/login');
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