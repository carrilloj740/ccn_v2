import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { MaterialModule } from 'src/app/material/material.module';
import { Injectable } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  hide = true;
  form: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private _snackBar: MatSnackBar,
    private router: Router,
    private apiService: ApiService
  ) {
    this.form = this.fb.group({
      usuario: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  ingresar() {
    this.loading = true;
    sessionStorage.setItem('OrganizationDEO_EMPID_c', '1');

    this.apiService
      .postOAuthToken(this.form.value.usuario, this.form.value.password)
      .subscribe({
        next: (res: any) => {
          const userDataToken = {
            token: res.access_token,
            expiresIn: res.expires_in,
            dateToken: new Date().getTime(),
          };


          console.log('Aca esta el user data',userDataToken);
          sessionStorage.setItem(
            'userDataToken',
            JSON.stringify(userDataToken)
          );

          console.log('Response', res);
          
          this.form.reset();
          this.loading = false;
          this.router.navigate(['inicio']);
        },
        error: (err: any) => {
          this.loading = false;
          this.formError('');
          console.log(err);
        },
      });
  }

  formError(description: any) {
    const desc = description || 'Incorrect user or password';
    this._snackBar.open(desc, '', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  ngOnInit(): void {
    //sessionStorage.setItem("partyNumber", "1Yp")
  }

  loadingHome() {
    this.loading = true;
    setTimeout(() => {
      this.router.navigate(['inicio']);
    }, 500);
  }
}
