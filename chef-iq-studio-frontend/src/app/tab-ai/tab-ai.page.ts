// /Users/ralphgannaban/Documents/dev/chefiq-full/chef-iq-studio-frontend/src/app/tab-ai/tab-ai.page.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel,
  IonButton, IonInput, IonText, IonSpinner, IonRadioGroup, IonRadio, IonCard,
  IonCardHeader, IonCardTitle, IonCardContent, IonIcon, IonButtons, IonToast,
  IonCardSubtitle,
  IonItemDivider,
  IonGrid,
  IonRow,
  IonCol,
  IonTextarea,
  IonFab,
  IonFabButton,
  IonSelect,
  IonSelectOption
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { heartOutline, heartSharp, bookmarkOutline, bookmarkSharp, listOutline, starHalfOutline, starOutline, star, refresh } from 'ionicons/icons';
import { AiService, ChefIQCooker, IngredientInput, AIRecipe } from '../services/ai.service';
import { AuthService, AuthResponse } from '../services/auth';
import { Subscription } from 'rxjs';

type CookingIntentOption = {
  value: 'Only These Ingredients' | 'Including These Ingredients';
  description: string;
};

@Component({
  selector: 'app-tab-ai',
  templateUrl: 'tab-ai.page.html',
  styleUrls: ['tab-ai.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel,
    IonButton, IonInput, IonText, IonSpinner, IonRadioGroup, IonRadio, IonCard,
    IonCardHeader, IonCardTitle, IonCardContent, IonIcon, IonButtons, IonToast,
    IonCardSubtitle,
    IonItemDivider,
    IonGrid,
    IonRow,
    IonCol,
    IonTextarea,
    IonFab,
    IonFabButton,
    IonSelect,
    IonSelectOption
  ],
})
export class tabAiPage implements OnInit, OnDestroy {
  // --- UI State Variables ---
  cookers: ChefIQCooker[] = [];
  selectedCookerId: string | null = null;
  selectedCookerName: string | null = null;

  currentQuantityInput: number | null = null;
  currentUnitInput: string = '';
  currentNameInput: string = '';

  addedIngredients: IngredientInput[] = [];
  ingredientValidationMessage: string | null = null;
  isAddIngredientButtonDisabled: boolean = true;
  isIngredientValidating: boolean = false;

  cookingIntent: 'Only These Ingredients' | 'Including These Ingredients' | null = null;
  cookingIntents: CookingIntentOption[] = [
    { value: 'Only These Ingredients', description: "Strictly use only what I've listed." },
    { value: 'Including These Ingredients', description: "Use these, and add complementary ingredients." }
  ];
  optionalTime: string = '';

  isGeneratingRecipe: boolean = false;
  generatedRecipe: AIRecipe | null = null;
  generateRecipeError: string | null = null;

  isSavingRecipe: boolean = false;
  saveRecipeMessage: string | null = null;

  showShoppingList: boolean = false;

  standardUnits: string[] = [
    'none',
    'whole', 'pieces', 'cloves', 'sheets', 'bunches', 'sprigs', 'stalks', 'cans', 'bottles', 'packs', 'leaves', 'slices', 'dashes', 'pinches',
    'grams', 'kg', 'ounces', 'lbs', 'pounds',
    'ml', 'liters', 'cups', 'fluid ounces', 'tablespoons', 'teaspoons',
    'medium', 'large', 'small'
  ];

  currentUser: AuthResponse | null = null;
  private authSubscription: Subscription | undefined;

  isToastOpen = false;
  toastMessage: string = '';

  feedbackRating: number = 0;
  feedbackComment: string = '';
  isSubmittingFeedback: boolean = false;

  constructor(
    private aiService: AiService,
    private authService: AuthService
  ) {
    addIcons({ heartOutline, heartSharp, bookmarkOutline, bookmarkSharp, listOutline, starHalfOutline, starOutline, star, refresh });
  }

  ngOnInit() {
    this.authSubscription = this.authService.user.subscribe(user => {
      this.currentUser = user;
    });
    this.loadCookers();
  }

  ngOnDestroy() {
    this.authSubscription?.unsubscribe();
  }

  setOpenToast(isOpen: boolean, message: string = '') {
    this.isToastOpen = isOpen;
    this.toastMessage = message;
  }

  getCookerImageUrl(cookerName: string): string {
    switch (cookerName.toLowerCase()) {
      case 'iq cooker':
        return 'assets/images/smarkcooker.png';
      case 'iq minioven':
        return 'assets/images/minioven.png';
      case 'iq sense':
        return 'assets/images/cq.png';
      default:
        return 'assets/images/placeholder-cooker.png';
    }
  }

  loadCookers() {
    this.aiService.getChefIQCookers().subscribe({
      next: (cookers) => {
        this.cookers = cookers;
        if (cookers.length > 0 && !this.selectedCookerId) {
            this.selectCooker(cookers[0]);
        }
      },
      error: (err) => {
        console.error('Failed to load Chef iQ Cookers:', err);
        this.setOpenToast(true, 'Failed to load cookers: ' + (err.message || 'Unknown error'));
      }
    });
  }

  selectCooker(cooker: ChefIQCooker) {
    this.selectedCookerId = cooker._id;
    this.selectedCookerName = cooker.name;
  }

  selectCookingIntent(intent: 'Only These Ingredients' | 'Including These Ingredients') {
    this.cookingIntent = intent;
  }

  onIngredientInputChange() {
    this.ingredientValidationMessage = null;
    const isQuantityValid = this.currentQuantityInput !== null && !isNaN(this.currentQuantityInput) && this.currentQuantityInput > 0;
    const isUnitValid = this.currentUnitInput.trim() !== '';
    const isNameValid = this.currentNameInput.trim() !== '';

    this.isAddIngredientButtonDisabled = !(isQuantityValid && isUnitValid && isNameValid) || this.isIngredientValidating;
  }

  async validateAndAddIngredient() {
    const quantity = this.currentQuantityInput;
    const unit = this.currentUnitInput.trim();
    const name = this.currentNameInput.trim();

    if (quantity === null || isNaN(quantity) || quantity <= 0) {
      this.ingredientValidationMessage = 'Please enter a valid positive number for quantity.';
      this.isAddIngredientButtonDisabled = true;
      return;
    }
    if (!unit) {
      this.ingredientValidationMessage = 'Please select a unit (e.g., "whole", "grams", "cups").';
      this.isAddIngredientButtonDisabled = true;
      return;
    }
    if (!name) {
      this.ingredientValidationMessage = 'Please enter the ingredient name.';
      this.isAddIngredientButtonDisabled = true;
      return;
    }

    const existingIngredient = this.addedIngredients.find(
      (ing) => this.normalizeIngredientName(ing.name) === this.normalizeIngredientName(name)
    );
    if (existingIngredient) {
      this.ingredientValidationMessage = `"${name}" is already in your list.`;
      this.isAddIngredientButtonDisabled = true;
      return;
    }

    this.isIngredientValidating = true;
    this.ingredientValidationMessage = null;

    try {
      const response = await this.aiService.validateIngredient(name).toPromise();
      if (response && response.isFood) {
        this.addedIngredients.push({
          name: response.name,
          quantity: quantity,
          unit: unit === 'none' ? '' : unit
        });
        this.currentQuantityInput = null;
        this.currentUnitInput = '';
        this.currentNameInput = '';
        this.onIngredientInputChange();
        this.ingredientValidationMessage = null;
      } else {
        this.ingredientValidationMessage = response?.reason || 'This is not a recognized food item.';
        this.isAddIngredientButtonDisabled = true;
      }
    } catch (error: any) {
      console.error('Ingredient validation error:', error);
      this.ingredientValidationMessage = error.message || 'Failed to validate ingredient.';
      this.isAddIngredientButtonDisabled = true;
    } finally {
      this.isIngredientValidating = false;
      this.onIngredientInputChange();
    }
  }

  removeIngredient(index: number) {
    this.addedIngredients.splice(index, 1);
    this.onIngredientInputChange();
  }

  private normalizeIngredientName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  canGenerateRecipe(): boolean {
    return (
      !!this.selectedCookerId &&
      this.addedIngredients.length > 0 &&
      !!this.cookingIntent &&
      !this.isGeneratingRecipe &&
      !this.isIngredientValidating
    );
  }

  generateRecipe() {
    this.isGeneratingRecipe = true;
    this.generateRecipeError = null;
    this.generatedRecipe = null;
    this.showShoppingList = false;

    this.aiService.generateAIRecipe(
      this.selectedCookerId!,
      this.addedIngredients,
      this.cookingIntent!,
      this.optionalTime
    ).subscribe({
      next: (recipe) => {
        this.generatedRecipe = recipe;
      },
      error: (err) => {
        console.error('Failed to generate recipe:', err);
        this.generateRecipeError = err.message || 'Failed to generate recipe. Please try again.';
        // *** FIX HERE: Provide a fallback string if generateRecipeError is null ***
        this.setOpenToast(true, this.generateRecipeError || 'Unknown error during recipe generation.');
      },
      complete: () => {
        this.isGeneratingRecipe = false;
      }
    });
  }

  saveGeneratedRecipe() {
    if (!this.generatedRecipe || !this.currentUser) {
      this.setOpenToast(true, 'Cannot save recipe: No recipe generated or not logged in.');
      return;
    }

    this.isSavingRecipe = true;
    this.saveRecipeMessage = null;

    this.aiService.saveAIRecipeToUserCollection(this.generatedRecipe._id).subscribe({
      next: (response) => {
        this.saveRecipeMessage = response.message;
        this.setOpenToast(true, response.message);
      },
      error: (err) => {
        console.error('Failed to save recipe:', err);
        this.saveRecipeMessage = err.message || 'Failed to save recipe.';
        // *** FIX HERE: Provide a fallback string if saveRecipeMessage is null ***
        this.setOpenToast(true, this.saveRecipeMessage || 'Unknown error saving recipe.');
      },
      complete: () => {
        this.isSavingRecipe = false;
      }
    });
  }

  submitFeedback() {
    if (!this.generatedRecipe || this.feedbackRating === 0) {
      this.setOpenToast(true, 'Please provide a rating before submitting feedback.');
      return;
    }

    this.isSubmittingFeedback = true;
    this.aiService.submitAIRecipeFeedback(this.generatedRecipe._id, this.feedbackRating, this.feedbackComment).subscribe({
      next: (response) => {
        this.setOpenToast(true, 'Feedback submitted successfully!');
        this.feedbackRating = 0;
        this.feedbackComment = '';
      },
      error: (err) => {
        console.error('Failed to submit feedback:', err);
        this.setOpenToast(true, err.message || 'Failed to submit feedback.');
      },
      complete: () => {
        this.isSubmittingFeedback = false;
      }
    });
  }

  setFeedbackRating(rating: number) {
    this.feedbackRating = rating;
  }

  getStarIcon(starNumber: number): string {
    if (this.feedbackRating >= starNumber) {
      return 'star';
    }
    return 'star-outline';
  }

  resetAiRecipeInputs() {
    this.generatedRecipe = null;
    this.generateRecipeError = null;
    this.selectedCookerId = null;
    this.selectedCookerName = null;
    this.addedIngredients = [];
    this.cookingIntent = null;
    this.optionalTime = '';
    this.showShoppingList = false;
    this.currentQuantityInput = null;
    this.currentUnitInput = '';
    this.currentNameInput = '';
    this.ingredientValidationMessage = null;
    this.isAddIngredientButtonDisabled = true;
    this.isIngredientValidating = false;
    this.feedbackRating = 0;
    this.feedbackComment = '';
    this.isSubmittingFeedback = false;
    this.isSavingRecipe = false;
    this.loadCookers();
  }
}