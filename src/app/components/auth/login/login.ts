import { Component } from '@angular/core';
import { MaterialModule } from '../../../shared/material.module';
@Component({
  imports: [MaterialModule],
  selector: 'app-login',
  standalone: true,
  styleUrl: './login.scss',
  templateUrl: './login.html',
})
export class Login {}
