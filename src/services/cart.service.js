const httpStatus = require("http-status");
const { Cart, Product } = require("../models");
const ApiError = require("../utils/ApiError");
const config = require("../config/config");

// TODO: CRIO_TASK_MODULE_CART - Implement the Cart service methods

/**
 * Fetches cart for a user
 * - Fetch user's cart from Mongo
 * - If cart doesn't exist, throw ApiError
 * --- status code  - 404 NOT FOUND
 * --- message - "User does not have a cart"
 *
 * @param {User} user
 * @returns {Promise<Cart>}
 * @throws {ApiError}
 */
const getCartByUser = async (user) => {
  const email = user.email;
  //console.log("in line 21",email)
  const userCart = await Cart.findOne({ email });
  if (!userCart) {
    throw new ApiError(httpStatus.NOT_FOUND, "User does not have a cart");
  } else {
    return userCart;
  }
};

/**
 * Adds a new product to cart
 * - Get user's cart object using "Cart" model's findOne() method
 * --- If it doesn't exist, create one
 * --- If cart creation fails, throw ApiError with "500 Internal Server Error" status code
 *
 * - If product to add already in user's cart, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product already in cart. Use the cart sidebar to update or remove product from cart"
 *
 * - If product to add not in "products" collection in MongoDB, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product doesn't exist in database"
 *
 * - Otherwise, add product to user's cart
 *
 *
 *
 * @param {User} user
 * @param {string} productId
 * @param {number} quantity
 * @returns {Promise<Cart>}
 * @throws {ApiError}
 */
const addProductToCart = async (user, productId, quantity) => {
  let cart = await Cart.findOne({ email: user.email });

  if (!cart) {
    try {
      cart = await Cart.create({
        email: user.email,
        cartItems: [],
        paymentOption: config.default_payment_option,
      });
    } catch (err) {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "500 Internal server error")
    }
  }

  if (cart == null) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "User don't have cart")
  }

  let productIndex = -1;
  for(let i=0;i<cart.cartItems.length;i++){
    if(productId.toString()===cart.cartItems[i].product._id.toString()){
      productIndex = i
    }
  }
  if (productIndex == -1) {
    let product = await Product.findOne({ _id: productId });

    if (product == null) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Product doesn't exist in db");
    }
    cart.cartItems.push({ product: product, quantity: quantity });
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, "Product already in cart. Use the cart sidebar to update or remove product from cart")
  }

  await cart.save();
  return cart;

}


/**
 * Updates the quantity of an already existing product in cart
 * - Get user's cart object using "Cart" model's findOne() method
 * - If cart doesn't exist, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "User does not have a cart. Use POST to create cart and add a product"
 *
 * - If product to add not in "products" collection in MongoDB, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product doesn't exist in database"
 *
 * - If product to update not in user's cart, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product not in cart"
 *
 * - Otherwise, update the product's quantity in user's cart to the new quantity provided and return the cart object
 *
 *
 * @param {User} user
 * @param {string} productId
 * @param {number} quantity
 * @returns {Promise<Cart>
 * @throws {ApiError}
 */
const updateProductInCart = async (user, productId, quantity) => {
  const email = user.email;
  const cart = await Cart.findOne({ email });
  if (!cart) {
    throw new ApiError(httpStatus.BAD_REQUEST, "User does not have a cart. Use POST to create cart and add a product");
  }
  else{
    let prodInDb = await Product.findOne({ _id: productId });
    if (prodInDb == null) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Product doesn't exist in database")
    } 
    else {
      for(let i=0;i<cart.cartItems.length;i++){
        if(cart.cartItems[i].product._id.toString()===productId.toString()){
          cart.cartItems[i].quantity = quantity;
          cart.save();
          return cart;
        }
      };
      throw new ApiError(httpStatus.BAD_REQUEST,"Product not in Cart");
    }
  }
};


/**
 * Deletes an already existing product in cart
 * - If cart doesn't exist for user, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "User does not have a cart"
 *
 * - If product to update not in user's cart, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product not in cart"
 *
 * Otherwise, remove the product from user's cart
 *
 *
 * @param {User} user
 * @param {string} productId
 * @throws {ApiError}
 */
const deleteProductFromCart = async (user, productId) => {
  const email = user.email;
  const cart = await Cart.findOne({ email });
  if (cart === null) {
    throw new ApiError(httpStatus.BAD_REQUEST, "User does not have cart");
  } else {
    const prodInCart = cart.cartItems.filter(item => item.product._id.toString() === productId);
    if (prodInCart.length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Product not in cart")
    } else {
      const id = prodInCart[0]._id;
      console.log(id)
      const deletedProd = await Cart.updateOne({
        "email": email
      },
        {
          "$pull": {
            "cartItems": {
              "_id": id
            }
          }
        });
      console.log("deleted", deletedProd)
      return deletedProd
    }
  }
};

// TODO: CRIO_TASK_MODULE_TEST - Implement checkout function
/**
 * Checkout a users cart.
 * On success, users cart must have no products.
 *
 * @param {User} user
 * @returns {Promise}
 * @throws {ApiError} when cart is invalid
 */
const checkout = async (user) => {
  const email = user.email
  let userCart = await Cart.findOne({email});
  console.log(userCart)
  if(!userCart){
    console.log("userCart logging in not found",userCart)
    throw new ApiError(httpStatus.NOT_FOUND,"User cart not found");
  }
  if(userCart.cartItems.length==0){
    console.log("if array length is zero",userCart.cartItems.length)
    throw new ApiError(httpStatus.BAD_REQUEST,"user cart is empty");
  }
  let defaultAddress = await user.hasSetNonDefaultAddress();
  console.log(user.address)
  if(defaultAddress===false){
    console.log("user add is not set")
    throw new ApiError(httpStatus.BAD_REQUEST,"User address is not set");
  }else{
  let cartTotal = 0;
  for(let i=0;i<userCart.cartItems.length;i++){
    let amount = userCart.cartItems[i].product.cost * userCart.cartItems[i].quantity;
    cartTotal = cartTotal + amount;
  };
  if(cartTotal>user.walletMoney){
    console.log("user bal is low")
    throw new ApiError(httpStatus.BAD_REQUEST,"Wallet balance insufficient");
  }
  user.walletMoney = user.walletMoney - cartTotal;
  userCart.cartItems = [];
  await userCart.save();
  await user.save();
  console.log(userCart);
  return userCart
}
};

module.exports = {
  getCartByUser,
  addProductToCart,
  updateProductInCart,
  deleteProductFromCart,
  checkout,
};
