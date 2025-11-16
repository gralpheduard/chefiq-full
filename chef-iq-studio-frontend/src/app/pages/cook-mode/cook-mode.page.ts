import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonBackButton,
  IonText, IonList, IonItem, IonLabel, IonIcon,
  LoadingController, ToastController, IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonChip
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { arrowForwardOutline, arrowBackOutline, checkmarkCircleOutline, listOutline, hardwareChipOutline, cameraOutline, videocamOutline } from 'ionicons/icons';

import { RecipeService, Recipe } from '../../services/recipe';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cook-mode',
  templateUrl: './cook-mode.page.html',
  styleUrls: ['./cook-mode.page.scss'],
  standalone: true,
  imports: [
    RouterModule,
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonBackButton,
    IonText, IonList, IonItem, IonLabel, IonIcon,
    IonCard, IonCardContent, IonCardHeader, IonCardTitle,
    IonChip
  ]
})
export class CookModePage implements OnInit, OnDestroy {
  recipe: Recipe | null = null;
  recipeId: string | null = null;
  currentPhase: 'ingredients' | 'steps' | 'finished' = 'ingredients';
  currentStepIndex: number = 0; // 0-indexed for steps array
  private recipeSubscription: Subscription | undefined;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recipeService: RecipeService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    addIcons({
      arrowForwardOutline, arrowBackOutline, checkmarkCircleOutline, listOutline,
      hardwareChipOutline, cameraOutline, videocamOutline
    });
  }

  ngOnInit() {
    console.log('CookModePage: ngOnInit called.');
    this.recipeId = this.route.snapshot.paramMap.get('id');
    console.log('CookModePage: Extracted recipeId from route:', this.recipeId);
    if (this.recipeId) {
      this.loadRecipe();
    } else {
      this.presentToast('No recipe ID provided for cooking mode.', 'danger');
      this.router.navigateByUrl('/tabs/tab1'); // Redirect if no ID
    }
  }

  ngOnDestroy() {
    if (this.recipeSubscription) {
      this.recipeSubscription.unsubscribe();
    }
  }

  async loadRecipe() {
    console.log('CookModePage: loadRecipe method called for ID:', this.recipeId);
    const loading = await this.loadingController.create({ message: 'Getting recipe ready for cooking...' });
    await loading.present();

    this.recipeSubscription = this.recipeService.getRecipeById(this.recipeId!).subscribe({
      next: (recipeData) => {
        this.recipe = recipeData;
        loading.dismiss();

        // --- NEW LOGGING HERE ---
        console.log('CookModePage: Full recipe data loaded:', JSON.stringify(this.recipe, null, 2));
        console.log('CookModePage: Recipe has ingredients:', !!this.recipe?.ingredients?.length);
        console.log('CookModePage: Recipe has steps:', !!this.recipe?.steps?.length);
        if (this.recipe?.steps) {
            this.recipe.steps.forEach((step, index) => {
                console.log(`CookModePage: Step ${index + 1} description:`, step.description);
                console.log(`CookModePage: Step ${index + 1} full object:`, JSON.stringify(step, null, 2));
            });
        }
        // --- END NEW LOGGING ---

        if (!this.recipe || !this.recipe.ingredients || this.recipe.ingredients.length === 0) {
            // If no ingredients, jump directly to steps if they exist
            if (this.recipe && this.recipe.steps && this.recipe.steps.length > 0) {
                this.currentPhase = 'steps';
                this.currentStepIndex = 0;
                console.log('CookModePage: No ingredients, jumping to steps.');
            } else {
                this.presentToast('Recipe has no ingredients or steps!', 'warning');
                this.router.navigateByUrl(`/recipe-detail/${this.recipeId}`); // Go back to detail
                console.log('CookModePage: Recipe has no ingredients or steps, redirecting back.');
            }
        }
      },
      error: (err) => {
        console.error('Error loading recipe for cook mode:', err);
        loading.dismiss();
        this.presentToast('Failed to load recipe for cooking.', 'danger');
        this.router.navigateByUrl(`/recipe-detail/${this.recipeId}`); // Go back to detail
      }
    });
  }

  nextPhase() {
    if (!this.recipe) return;

    if (this.currentPhase === 'ingredients') {
      if (this.recipe.steps && this.recipe.steps.length > 0) {
        this.currentPhase = 'steps';
        this.currentStepIndex = 0;
      } else {
        this.currentPhase = 'finished'; // No steps, go straight to finished
      }
    } else if (this.currentPhase === 'steps') {
      if (this.currentStepIndex < this.recipe.steps.length - 1) {
        this.currentStepIndex++;
      } else {
        this.currentPhase = 'finished'; // All steps completed
      }
    }
    // No action if already finished
  }

  previousPhase() {
    if (!this.recipe) return;

    if (this.currentPhase === 'steps') {
      if (this.currentStepIndex > 0) {
        this.currentStepIndex--;
      } else {
        this.currentPhase = 'ingredients'; // Back to ingredients
      }
    } else if (this.currentPhase === 'finished') {
        // If finished and coming from steps, go to last step
        if (this.recipe.steps && this.recipe.steps.length > 0) {
            this.currentPhase = 'steps';
            this.currentStepIndex = this.recipe.steps.length - 1;
        } else {
            this.currentPhase = 'ingredients'; // No steps, back to ingredients
        }
    }
    // No action if already on ingredients and trying to go back
  }

  finishCooking() {
    this.router.navigateByUrl(`/recipe-detail/${this.recipeId}`);
    this.presentToast('Hope you enjoyed cooking!', 'success');
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

  get showPreviousButton(): boolean {
      return this.currentPhase === 'steps' || this.currentPhase === 'finished';
  }

  get showNextButton(): boolean {
      return this.currentPhase !== 'finished';
  }

  get showFinishButton(): boolean {
      return this.currentPhase === 'finished';
  }
}