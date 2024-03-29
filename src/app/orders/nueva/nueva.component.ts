import { Component, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { FormBuilder, FormControl, FormGroup, Validators, FormsModule } from '@angular/forms';
import { AddService, Orden } from 'src/app/services/add.service';
import { Product } from './Product';
import { Order } from './Order';
import { logicFilling } from './logic';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmOrderComponent } from '../confirm-order/confirm-order.component';
import { MatDialog } from '@angular/material/dialog';

export interface Data {
  sku: string;
  description: number;
  quantity: number;
}

interface pay {
  value: string;
  name: string
}

const ELEMENT_DATA: Data[] = [
];

@Component({
  selector: 'app-nueva',
  templateUrl: './nueva.component.html',
  styleUrls: ['./nueva.component.css'],
  providers: [AddService]

})

export class NuevaComponent {


  pays: pay[] = [
    { value: 'GR', name: 'Credit' },
    { value: 'UN', name: 'Debit' },
  ];
  
  displayedColumns: string[] = ['sku', 'description','ListPrice' ,'quantity','totalAmount','action'];
  bodegas: any[] = [];
  gstValue : string = 'GR'
  selectedProduct = {} as any;
  selectedProductDetails = {} as any;
  selectedWarhouse = {} as any;
  incoterm: string = "";
  shipTo: string = "";
  shipmentTypeList: any[] = [];
  containerTypeList: any[] = [];

  logic: logicFilling = {
    pallets: 0,
    quantity: 0,
  };

  hidden = false;
  cantidad: any;
  cantidadMul: any = 20;
  confirmaCantidad: boolean = false;
  selected = 'Truck';
  shipmentType: string = ''
  buttonDisabled: boolean = true;
  formHeader: FormGroup;
  formProduct: FormGroup;
  productsList: any = []
  accountAddressesList: any = []
  shoppingCartList: any = []
  minDate: Date;
  maxDate: Date;
  productos: Product[] = [];
  warehouseAmount: number = 0;
  warehouseAmountAux: number = 0;
  totalAmount: string = '';
  grupoEmpresario: any = {}
  dataSourceShoppingCarts: any[] = ELEMENT_DATA;
  
  validoParaComprar: boolean = false;
  CantidadDeContenedorTotal: number = 1;
  territory: string = ''
  PesoTotalARepartir: number = 0;

  pallets: number[] = [];
  auxPallets:number[] = [];
  cantidadDeProductosPorPallet = 0
  pesoPorPallet: number | undefined;
  timeStampTest = Date.now();
  pesoMaximo = 0;
  pesoMinimo = 10000
  availableCapacity = 20000;
  RESPONSE: any = []
  disabledPaymentType = false
  pesoTotal:number = 0;
  totalAmountReached = false;
  businessGroupReached= false;
  warehouseAmountAfterPurchase: number = 0;
  businessGroupAfterPurchase: number = 0
  disableSelect = new FormControl(false);


  constructor(private fb: FormBuilder, private addService: AddService, private apiService: ApiService, private _snackBar: MatSnackBar, private dialog: MatDialog) {

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();
    this.minDate = new Date(currentYear, currentMonth, 45);
    this.maxDate = new Date(currentYear, currentMonth + 1, 136);

    const date = new Date(2020, 11, 16);

    this.formHeader = new FormGroup({
      
      paymentType: new FormControl(),
      territory: new FormControl(),
      etd: new FormControl(Validators.required),
      poNbr: new FormControl(),
      incortem: new FormControl(),
      soldTo: new FormControl(),
      shipTo: new FormControl(),
      shipmentType: new FormControl(),

    })

    this.formProduct = new FormGroup({
      sku: new FormControl(),
      description: new FormControl(),
      containerType: new FormControl(),
      quantity: new FormControl(),
      loading: new FormControl(),
      minimumOrder: new FormControl(1, Validators.min(1)),
      quantityContainer: new FormControl(),
      pallets: new FormControl(),
      shipmentType: new FormControl(),
    })
  }

  listaProductos: any = [];
  productoSeleccionado = "";

  ngOnInit(): void {
    // this.getAddress()
    // this.getAccountShoppingCart()
    this.accountAddressesList = this.apiService.bodegas
    this.addService.getProductos().subscribe(productos => {
      this.productos = productos;
    });
  }

  toggleBadgeVisibility() {
    this.hidden = !this.hidden;
  }

  getAccountShoppingCart() {
    this.apiService.getAccountInfo(this.apiService.bodegaSeleccionada.PartyNumber).subscribe((account: any) => {
      // this.apiService.account = account
      // TODO: unificar llamada del getAccountInfo
      console.log( "account",account)
      this.getItemShoppingCart(account["OrganizationDEO___ORACO__ShoppingCart_Id_c"])
    })
  }

  getItemShoppingCart(shoppingCartId: any) {
    this.apiService.getShoppingCartItems(shoppingCartId)
      .subscribe((shoppingCart: any) => {
        this.shoppingCartList = shoppingCart.items
        console.log('ShoppingCartList',this.shoppingCartList)
      });
  }

  selectSoldTo(account: any) {
    console.log("account",account)
    this.productsList = [];
    this.apiService.bodegaSeleccionada = account
    this.getItemPrices()
    this.getShoppingCartList(this.apiService.bodegaSeleccionada.OrganizationDEO___ORACO__ShoppingCart_Id_c)
    this.getContainers()
    this.incoterm = account.OrganizationDEO_INCOTERM_c
    this.shipTo = account.FormattedAddress
    this.warehouseAmount = parseFloat(account.OrganizationDEO_DisponibleDeCredito_c.toFixed(2))

    this.grupoEmpresario = this.apiService.padre
    this.territory = account.OrganizationDEO_Territorio_c

  }

  async onSubmitProducto() {

    // Boton de agregado
    //TODO: abrir el modal  de add item NO PUEDE CERRAR HASTA QUE TERMINE EN getShoppingCartList
    this.disabledPaymentType = true
    console.log(this.timeStampTest, "Time Stamp");
    console.log(this.apiService.bodegaSeleccionada);
    this.pesoMaximo -= this.formProduct.value.pallets * this.selectedProductDetails.PesoProducto_c
    console.log("Llamé agregar producto");
    this.addService.agregarProducto(this.apiService.bodegaSeleccionada.OrganizationDEO___ORACO__ShoppingCart_Id_c, new Product(this.selectedProduct.InvItemId, this.formProduct.value.sku.ItemNumber, this.formProduct.value.sku.ItemDescription, this.formProduct.value.quantity, this.formProduct.value.typeContainer, this.formProduct.value.quantityContainer, this.formProduct.value.minimumOrder, this.formProduct.value.pallets), this.formHeader.value.etd, this.formHeader.value.paymentType, this.selectedProduct.ListPrice).then(res => {
      this.getShoppingCartList(this.apiService.bodegaSeleccionada.OrganizationDEO___ORACO__ShoppingCart_Id_c);
      this.RESPONSE = res;
      console.log("Termino el agregado de producto");
      console.log("RESPONSE", this.RESPONSE)
    });
    // this.formProduct.reset();
    this.PesoTotalARepartir = 0;
  }

  getItems() {
    this.apiService.getItems()
      .subscribe((products: any) => this.productsList = products.items);
    console.log(this.productsList)
  }

  getItemPrices() {
    this.apiService.getAccountInfo(this.apiService.bodegaSeleccionada.PartyNumber).subscribe((account: any) => {
      console.log(account)
      this.apiService.account = account
      this.apiService.getPriceList(account.OrganizationDEO___ORACO__PriceBook_Id_c).subscribe((priceBookInfo: any) => {
        this.getShoppingCartList(this.apiService.bodegaSeleccionada.OrganizationDEO___ORACO__ShoppingCart_Id_c)
        console.log(priceBookInfo)
        if (priceBookInfo.StatusCode == 'ACTIVE') {
          this.apiService.getPrice(account.OrganizationDEO___ORACO__PriceBook_Id_c).subscribe((priceItems: any) => {
            console.log(priceItems)
            this.productsList = priceItems.items
          })
        }
      })
    })
  }

  async completarOrden() {
    // ConfimarOrden - Boton de confirmación
    console.log(new Order(this.formHeader.value.poNbr, this.formHeader.value.shipTo, this.formHeader.value.incortem, this.formHeader.value.soldTo, this.formHeader.value.etd, this.formProduct.value.shipmentType, this.addService.productos))
    console.log(this.formHeader.value)
    this.apiService.confirmationShoppingCart(this.apiService.bodegaSeleccionada.OrganizationDEO___ORACO__ShoppingCart_Id_c).subscribe((response: any) => {
      console.log(this.RESPONSE);
      this.apiService.getOrderLinesRollupFilter(this.apiService.bodegaSeleccionada.PartyId, this.RESPONSE.__ORACO__ComboSelQuantity_c).subscribe((lines: any) => {
        const orderID = lines.items[0].__ORACO__Order_Id_c;
        const containerType = this.shipmentType
        // lo que estaba causando el error en Maritimo null: + this.formProduct.value.containerType
        this.apiService.patchIdOrder(orderID, this.formHeader.value.poNbr, this.formHeader.value.etd, containerType, this.RESPONSE.__ORACO__ComboSelQuantity_c, this.formHeader.value.paymentType, this.apiService.bodegaSeleccionada.OrganizationDEO_Territorio_c
        ).subscribe(response => console.info(response));
      })
      this.openDialog()
    })
  }

  calculo(cantidadDeProducto: number) {
    this.PesoTotalARepartir = this.selectedProductDetails.PesoProducto_c * cantidadDeProducto;
  }

  seRepiteSKU(){
    let seRepite = false
    this.shoppingCartList.forEach((product:any)=>{
      if(product.__ORACO__Product_Id_c == this.selectedProduct.InvItemId){
        seRepite = true
      } 
    })
    return seRepite;
  }

  
  validaPrecio(){
    let validaPrecio = false
      if(this.formProduct.value.pallets * this.selectedProduct.ListPrice < this.warehouseAmount){
        validaPrecio = true
      } 
    return validaPrecio;
  }


  error() {
    this._snackBar.open('Invalid quantity', '', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    })
  }

  getContainers() {
    this.apiService.getListAddress(this.apiService.bodegaSeleccionada.PartyNumber).subscribe((address: any) => {
      this.apiService.getShipmentType(this.apiService.bodegaSeleccionada.PartyNumber, address.items[0].AddressNumber).subscribe((shipmentType: any) => {
        this.shipmentType = shipmentType.PartySiteEO_TIPODECONTENEDOR_c == 'Terrestre' ? 'Land Shipping' : 'Maritime Shipping'
        this.pesoMaximo = shipmentType.PartySiteEO_TIPODECONTENEDOR_c == 'Terrestre' ? 21000 : 20500

      })
    })
  }

  getShoppingCartList(shoppingCartId: number) {
    this.apiService.getShoppingCartItems(shoppingCartId)
      .subscribe((shoppingCart: any) => {
        this.shoppingCartList = shoppingCart.items;
        this.dataSourceShoppingCarts = this.shoppingCartList;
        console.log('shoppingCart', this.shoppingCartList);
        let maxCapacity = this.pesoMaximo;
        this.totalAmountReached = false;
        this.shoppingCartList.forEach((item: any) => {
          maxCapacity -= item['__ORACO__Quantity_c'];
        });
        if (this.shoppingCartList.length > 0) {
          this.gstValue =
            this.shoppingCartList[0].__ORACO__Tax1_c == 1 ? 'GR' : 'UN';
          this.disabledPaymentType = true;
          console.log('SCPrinceUOM', this.shoppingCartList[0]);
        } else {
          this.disabledPaymentType = false;
        }
        this.warehouseAmountAfterPurchase = parseFloat(this.warehouseAmount.toFixed(2));
        let totalAmount = 0;
        this.shoppingCartList.forEach((item: any) => {
          totalAmount += item.__ORACO__Tax2_c * item.__ORACO__Quantity_c;
        });
        this.warehouseAmountAfterPurchase -= parseFloat(totalAmount.toFixed(2));
        this.businessGroupAfterPurchase -= parseFloat(totalAmount.toFixed(2));
        console.log('WarehouseAmountAfterPurchase', this.warehouseAmountAfterPurchase);
        console.log('GrupoEmpresario', this.grupoEmpresario.OrganizationDEO_DisponibleDeCredito_c)
        if(this.warehouseAmountAfterPurchase < 0 ) this.totalAmountReached = true;
        // TODO: Lógica para condición de grupo empresario, revisar
        if(this.grupoEmpresario.OrganizationDEO_DisponibleDeCredito_c < 0 ) this.businessGroupReached = true;
        console.log('DisponibleCredito',this.grupoEmpresario.OrganizationDEO_DisponibleDeCredito_c < 0);
        
        console.log('totalamount', totalAmount);
        this.availableCapacity = maxCapacity;
        console.log('maxCapacity', maxCapacity);
        // console.log("dataSource", this.dataSource)
        // console.log("shoppingCart", this.shoppingCartList)
        this.updatePallets();
        this.pesoTotal = 0;
        this.shoppingCartList.map((product: any) => {
          this.apiService
            .getItemById(product.__ORACO__Product_Id_c)
            .subscribe((item: any) => {
              console.log('item:', item);
              this.pesoTotal +=
                product.__ORACO__Quantity_c * item.PesoProducto_c;
            });
        });
        //TODO: cierra el modal de add item
      });
  }

  getItemInfo(producto: any) {
    this.pallets = []
    this.selectedProduct = producto
    console.log(producto);
    this.apiService.getItemById(producto.InvItemId).subscribe((item: any) => {
      this.selectedProductDetails = item
      for (let i = 1; i <= 20; i++) {
        if ((this.selectedProductDetails.CantidadPorPallet_c * i * this.selectedProductDetails.PesoProducto_c < this.pesoMaximo)) {
          this.pallets.push(this.selectedProductDetails.CantidadPorPallet_c * i)
        }
     
      }
      this.auxPallets = this.pallets
      this.updatePallets()
    })
  }

  deleteShoppingCartItem(shoppingCartId: any, productId: any) {
    this.apiService.deleteShoppingCartItem(shoppingCartId, productId).subscribe((response: any) => {
      this.getShoppingCartList(this.apiService.bodegaSeleccionada.OrganizationDEO___ORACO__ShoppingCart_Id_c)
    })
  }

  updatePallets() {
    if(this.availableCapacity >= 2000){
      this.pallets = this.auxPallets
    } else{
      console.log('availableCapacity', this.availableCapacity);
      console.log('pallets', this.pallets);
      console.log('pallets filtrado', this.pallets.filter(pallet => pallet < this.availableCapacity));
      this.pallets = this.pallets.filter(pallet => pallet < this.availableCapacity)
    }
  }

  openDialog() {
    this.dialog.open(ConfirmOrderComponent,{
      width: '30%',
      disableClose: true,
      data: { totalAmountReached: this.totalAmountReached}
    });


  }

  filteringProducts(productsList: any[]): any[]{
    let result: any[] = []
    let uomCode = this.formHeader.value.paymentType
    return productsList.filter( item => item.PriceUOMCode.includes(uomCode));
  }
 

}

