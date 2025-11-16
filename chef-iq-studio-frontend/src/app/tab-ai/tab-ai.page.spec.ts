import { ComponentFixture, TestBed } from '@angular/core/testing';

import { tabAiPage } from './tab-ai.page';

describe('tabAiPage', () => {
  let component: tabAiPage;
  let fixture: ComponentFixture<tabAiPage>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(tabAiPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
