// src/app/tab2/tab2.page.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonButtons, IonIcon, IonText, AlertController,
  LoadingController, ToastController, IonList,IonCard,IonCardContent,
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { addOutline, createOutline, trashOutline, eyeOutline } from 'ionicons/icons'; // Removed checkmarkCircleOutline

import { AuthService, UserProfile } from '../services/auth';
import { RecipeService, Recipe } from '../services/recipe';
import { RecipeCardComponent } from '../components/recipe-card/recipe-card.component';

import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cookbook',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonHeader, IonToolbar, IonTitle, IonContent,IonCard,IonCardContent,
    IonButton, IonButtons, IonIcon, IonText,
    RecipeCardComponent,
  ]
})
export class Tab2Page implements OnInit, OnDestroy {
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
    addIcons({ addOutline, createOutline, trashOutline, eyeOutline }); // Removed checkmarkCircleOutline

    this.userSubscription = this.authService.user.subscribe((user: UserProfile | null) => {
      if (!user) {
        this.currentUser = null;
        this.userRecipes = [];
        this.router.navigateByUrl('/login');
      } else {
        this.currentUser = user;
      }
    });
  }

  ngOnInit() {
    // We can fetch user profile and recipes here or in ionViewWillEnter
    // ionViewWillEnter is better for tab components as it fires every time the tab is active
  }

  ionViewWillEnter() {
    this.fetchUserProfile();
    this.fetchUserRecipes();
  }

  ngOnDestroy() {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  async fetchUserProfile() {
    if (!this.currentUser) {
        const loading = await this.loadingController.create({
            message: 'Loading user data...',
        });
        try {
            const userProfile = await this.authService.getMe().toPromise();
            if (userProfile) {
                this.currentUser = userProfile;
            } else {
                throw new Error('User profile data is empty or invalid.');
            }
        } catch (err: any) {
            console.error("Error fetching user profile:", err);
            this.authService.logout();
            this.router.navigateByUrl('/login');
        } finally {
            // await loading.dismiss(); // Keep this commented out if you don't show loading
        }
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
      if (error.message.includes('Not authenticated')) {
        this.authService.logout();
        this.router.navigateByUrl('/login');
      }
    } finally {
      await loading.dismiss();
    }
  }

  onViewRecipeDetail(recipeId: string) {
    this.router.navigateByUrl(`/recipe-detail/${recipeId}`);
  }

  onEditRecipe(recipeId: string) {
    this.router.navigateByUrl(`/recipe-form/${recipeId}`);
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
              this.fetchUserRecipes(); // Refresh the list
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

  // REMOVED: onPublishRecipe method
  // async onPublishRecipe(recipeId: string) {
  //   const loading = await this.loadingController.create({ message: 'Publishing recipe...' });
  //   await loading.present();
  //   try {
  //     await this.recipeService.publishRecipe(recipeId).toPromise();
  //     await loading.dismiss();
  //     this.presentToast('Recipe submitted for review!', 'success');
  //     this.fetchUserRecipes();
  //   } catch (error: any) {
  //     await loading.dismiss();
  //     console.error('Error publishing recipe:', error);
  //     this.presentToast(error.message || 'Failed to publish recipe.', 'danger');
  //   }
  // }

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