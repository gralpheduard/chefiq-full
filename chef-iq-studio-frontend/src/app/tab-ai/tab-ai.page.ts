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
  IonSelect, // Import IonSelect
  IonSelectOption // Import IonSelectOption
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { heartOutline, heartSharp, bookmarkOutline, bookmarkSharp, listOutline, starHalfOutline, starOutline, star, refresh } from 'ionicons/icons';
import { AiService, ChefIQCooker, IngredientInput, AIRecipe } from '../services/ai.service';
import { AuthService, AuthResponse } from '../services/auth';
import { Subscription } from 'rxjs';

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
    IonSelect, // Add IonSelect
    IonSelectOption // Add IonSelectOption
  ],
})
export class tabAiPage implements OnInit, OnDestroy {
  // --- UI State Variables ---
  cookers: ChefIQCooker[] = [];
  selectedCookerId: string | null = null;
  selectedCookerName: string | null = null;

  // New input fields for quantity, unit, and name
  currentQuantityInput: number | null = null;
  currentUnitInput: string = ''; // This will now hold a value from the dropdown
  currentNameInput: string = '';

  addedIngredients: IngredientInput[] = [];
  ingredientValidationMessage: string | null = null;
  isAddIngredientButtonDisabled: boolean = true;
  isIngredientValidating: boolean = false;

  cookingIntent: 'Only These Ingredients' | 'Including These Ingredients' | null = null;
  optionalTime: string = '';

  isGeneratingRecipe: boolean = false;
  generatedRecipe: AIRecipe | null = null;
  generateRecipeError: string | null = null;

  isSavingRecipe: boolean = false;
  saveRecipeMessage: string | null = null;

  showShoppingList: boolean = false;

  // *** MODIFICATION START: Standard units are already here ***
  standardUnits: string[] = [
    'none', // For items like "1 onion" where the unit is implicitly "whole" or "piece"
    'whole', 'pieces', 'cloves', 'sheets', 'bunches', 'sprigs', 'stalks', 'cans', 'bottles', 'packs', 'leaves', 'slices', 'dashes', 'pinches',
    'grams', 'kg', 'ounces', 'lbs', 'pounds',
    'ml', 'liters', 'cups', 'fluid ounces', 'tablespoons', 'teaspoons',
    'medium', 'large', 'small' // Descriptive units for items without standard weight/volume
  ];
  // *** MODIFICATION END ***

  // --- Auth State ---
  currentUser: AuthResponse | null = null;
  private authSubscription: Subscription | undefined;

  // --- Toast ---
  isToastOpen = false;
  toastMessage: string = '';

  // --- Feedback ---
  feedbackRating: number = 0; // For 5-star rating, 0 means not rated
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

  // --- Utility Functions ---
  setOpenToast(isOpen: boolean, message: string = '') {
    this.isToastOpen = isOpen;
    this.toastMessage = message;
  }

  // *** NEW FUNCTION ADDED HERE FOR IMAGE MAPPING ***
  getCookerImageUrl(cookerName: string): string {
    console.log(cookerName)
    switch (cookerName.toLowerCase()) { // Use toLowerCase for robustness
      case 'iq cooker':
        return 'assets/images/smarkcooker.png';
      case 'iq minioven':
        return 'assets/images/minioven.png';
      case 'iq sense':
        return 'assets/images/cq.png';
      default:
        return 'assets/images/placeholder-cooker.png'; // A generic fallback image
    }
  }
  // *** END NEW FUNCTION ***


  // --- Cooker Selection Logic ---
  loadCookers() {
    this.aiService.getChefIQCookers().subscribe({
      next: (cookers) => {
        this.cookers = cookers;
        // Optionally pre-select the first cooker if available and nothing is selected
        if (cookers.length > 0 && !this.selectedCookerId) {
            this.selectCooker(cookers[0]);
        }
      },
      error: (err) => {
        console.error('Failed to load Chef iQ Cookers:', err);
        this.setOpenToast(true, 'Failed to load cookers: ' + (err.message || 'Unknown error')); // Safer error message
      }
    });
  }

  selectCooker(cooker: ChefIQCooker) {
    this.selectedCookerId = cooker._id;
    this.selectedCookerName = cooker.name;
  }

  // --- Ingredient Input and Validation Logic ---
  onIngredientInputChange() {
    this.ingredientValidationMessage = null; // Clear validation message
    const isQuantityValid = this.currentQuantityInput !== null && !isNaN(this.currentQuantityInput) && this.currentQuantityInput > 0;
    // For unit, just check if it's selected (not empty or 'none' if 'none' is the default placeholder)
    // If 'none' is a valid choice (e.g., for "1 onion"), then check for non-empty string.
    // If you want to force a more descriptive unit, you could check `this.currentUnitInput !== 'none'`.
    const isUnitValid = this.currentUnitInput.trim() !== '';
    const isNameValid = this.currentNameInput.trim() !== '';

    this.isAddIngredientButtonDisabled = !(isQuantityValid && isUnitValid && isNameValid) || this.isIngredientValidating;
  }

  async validateAndAddIngredient() {
    const quantity = this.currentQuantityInput;
    const unit = this.currentUnitInput.trim();
    const name = this.currentNameInput.trim();

    // Client-side validation for the three fields
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

    // Check for duplicates based on name (case-insensitive, non-alphanumeric removed)
    const existingIngredient = this.addedIngredients.find(
      (ing) => this.normalizeIngredientName(ing.name) === this.normalizeIngredientName(name)
    );
    if (existingIngredient) {
      this.ingredientValidationMessage = `"${name}" is already in your list.`;
      this.isAddIngredientButtonDisabled = true;
      return;
    }

    this.isIngredientValidating = true;
    this.ingredientValidationMessage = null; // Clear previous messages

    try {
      // Validate just the name with the backend's AI service
      const response = await this.aiService.validateIngredient(name).toPromise();
      if (response && response.isFood) {
        this.addedIngredients.push({
          name: response.name, // Use the canonical name from backend
          quantity: quantity,
          unit: unit === 'none' ? '' : unit // Store 'none' as an empty string for cleaner display/backend
        });
        // Clear inputs after successful addition
        this.currentQuantityInput = null;
        this.currentUnitInput = ''; // Reset dropdown to default/empty
        this.currentNameInput = '';
        this.onIngredientInputChange(); // Re-evaluate button state
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
      this.onIngredientInputChange(); // Re-evaluate button state
    }
  }

  removeIngredient(index: number) {
    this.addedIngredients.splice(index, 1);
    this.onIngredientInputChange(); // Re-evaluate button state
  }

  private normalizeIngredientName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, ''); // Remove non-alphanumeric for comparison
  }


  // --- Recipe Generation Logic ---
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
    this.showShoppingList = false; // Reset shopping list view

    this.aiService.generateAIRecipe(
      this.selectedCookerId!,
      this.addedIngredients,
      this.cookingIntent!,
      this.optionalTime
    ).subscribe({
      next: (recipe) => {
        this.generatedRecipe = recipe;
        console.log('Generated Recipe:', recipe);
      },
      error: (err) => {
        console.error('Failed to generate recipe:', err);
        this.generateRecipeError = err.message || 'Failed to generate recipe. Please try again.';
        this.setOpenToast(true, this.generateRecipeError || 'Unknown error during recipe generation.'); // Safely pass to toast
      },
      complete: () => {
        this.isGeneratingRecipe = false;
      }
    });
  }

  // --- Save Recipe Logic ---
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
        // Optionally, update UI to show it's saved (e.g., disable save button)
      },
      error: (err) => {
        console.error('Failed to save recipe:', err);
        this.saveRecipeMessage = err.message || 'Failed to save recipe.';
        this.setOpenToast(true, this.saveRecipeMessage || 'Unknown error saving recipe.'); // Safely pass to toast
      },
      complete: () => {
        this.isSavingRecipe = false;
      }
    });
  }

  // --- Feedback Logic ---
  submitFeedback() {
    if (!this.generatedRecipe || this.feedbackRating === 0) {
      this.setOpenToast(true, 'Please provide a rating before submitting feedback.');
      return;
    }

    this.isSubmittingFeedback = true;
    this.aiService.submitAIRecipeFeedback(this.generatedRecipe._id, this.feedbackRating, this.feedbackComment).subscribe({
      next: (response) => {
        this.setOpenToast(true, 'Feedback submitted successfully!');
        this.feedbackRating = 0; // Reset
        this.feedbackComment = ''; // Reset
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
      return 'star'; // Filled star
    }
    // You could also add 'star-half' logic here if needed
    return 'star-outline'; // Empty star
  }

  // Reset method for all AI recipe generation inputs
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
    this.loadCookers(); // Reload cookers just in case
  }
}