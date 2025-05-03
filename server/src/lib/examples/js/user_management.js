/**
 * User Management Module
 * Example JavaScript code with modern patterns
 */

// User class definition
class User {
  constructor(id, name, email, role = 'user', active = true) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.role = role;
    this.active = active;
    this.createdAt = new Date();
    this.loginCount = 0;
  }

  login() {
    this.loginCount++;
    console.log(`User ${this.name} logged in. Total logins: ${this.loginCount}`);
    return true;
  }

  deactivate() {
    this.active = false;
    console.log(`User ${this.name} has been deactivated`);
  }

  updateRole(newRole) {
    this.role = newRole;
    console.log(`User ${this.name} role updated to ${newRole}`);
  }
}

// UserManager class to handle collections of users
class UserManager {
  constructor(initialUsers = []) {
    this.users = initialUsers;
    this.deletedUsers = [];
  }

  addUser(user) {
    if (!user || !(user instanceof User)) {
      throw new Error('Invalid user object');
    }
    
    // Check if user with same email already exists
    if (this.findUserByEmail(user.email)) {
      console.log(`User with email ${user.email} already exists`);
      return false;
    }
    
    this.users.push(user);
    console.log(`Added user: ${user.name}`);
    return true;
  }

  removeUser(userId) {
    const index = this.users.findIndex(user => user.id === userId);
    
    if (index !== -1) {
      const removedUser = this.users.splice(index, 1)[0];
      this.deletedUsers.push(removedUser);
      console.log(`Removed user: ${removedUser.name}`);
      return true;
    }
    
    console.log(`User with ID ${userId} not found`);
    return false;
  }

  findUserById(userId) {
    return this.users.find(user => user.id === userId);
  }

  findUserByEmail(email) {
    return this.users.find(user => user.email === email);
  }

  getAllUsers() {
    return this.users;
  }

  getActiveUsers() {
    return this.users.filter(user => user.active);
  }

  getUsersByRole(role) {
    return this.users.filter(user => user.role === role);
  }

  getUserCount() {
    return this.users.length;
  }

  printUserReport() {
    console.log('===== USER REPORT =====');
    console.log(`Total users: ${this.getUserCount()}`);
    console.log(`Active users: ${this.getActiveUsers().length}`);
    
    const admins = this.getUsersByRole('admin');
    console.log(`Admin users: ${admins.length}`);
    
    console.log('\nUser List:');
    this.users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - ${user.role} - ${user.active ? 'Active' : 'Inactive'}`);
    });
    
    console.log('=======================');
  }
}

// Example usage
function initializeUserSystem() {
  // Create a user manager
  const userManager = new UserManager();
  
  // Add some users
  const john = new User(1, 'John Doe', 'john@example.com', 'admin');
  const jane = new User(2, 'Jane Smith', 'jane@example.com');
  const bob = new User(3, 'Bob Johnson', 'bob@example.com', 'manager');
  
  userManager.addUser(john);
  userManager.addUser(jane);
  userManager.addUser(bob);
  
  // Simulate user actions
  john.login();
  jane.login();
  
  // Update a user
  jane.updateRole('support');
  
  // Deactivate a user
  bob.deactivate();
  
  // Get user reports
  userManager.printUserReport();
  
  // Find specific users
  const foundUser = userManager.findUserByEmail('jane@example.com');
  if (foundUser) {
    console.log(`Found user: ${foundUser.name}`);
  }
  
  // Remove a user
  userManager.removeUser(1);
  
  // Print final report
  userManager.printUserReport();
  
  return userManager;
}

// Run the example
initializeUserSystem(); 