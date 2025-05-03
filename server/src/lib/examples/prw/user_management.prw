#Include "Protheus.ch"
#Include "TOTVS.ch"

/*
* User Management Module
* Example ADVPL code with standard patterns
*/

// User class/structure equivalent
User Function User(nId, cName, cEmail, cRole, lActive)
    Local oUser := {=>}
    
    Default cRole := "user"
    Default lActive := .T.
    
    // Initialize user properties
    oUser["id"] := nId
    oUser["name"] := cName
    oUser["email"] := cEmail
    oUser["role"] := cRole
    oUser["active"] := lActive
    oUser["createdAt"] := Date()
    oUser["loginCount"] := 0
    
    // Initialize methods (using closures in ADVPL)
    oUser["login"] := {|| UserLogin(oUser) }
    oUser["deactivate"] := {|| UserDeactivate(oUser) }
    oUser["updateRole"] := {|cNewRole| UserUpdateRole(oUser, cNewRole) }
    
    Return oUser
Return Nil

// User methods implementations
Static Function UserLogin(oUser)
    oUser["loginCount"]++
    ConOut("User " + oUser["name"] + " logged in. Total logins: " + cValToChar(oUser["loginCount"]))
    Return .T.
Return Nil

Static Function UserDeactivate(oUser)
    oUser["active"] := .F.
    ConOut("User " + oUser["name"] + " has been deactivated")
Return Nil

Static Function UserUpdateRole(oUser, cNewRole)
    oUser["role"] := cNewRole
    ConOut("User " + oUser["name"] + " role updated to " + cNewRole)
Return Nil

// UserManager to handle collections of users
User Function UserManager(aInitialUsers)
    Local oManager := {=>}
    
    Default aInitialUsers := {}
    
    // Initialize properties
    oManager["users"] := aInitialUsers
    oManager["deletedUsers"] := {}
    
    // Initialize methods
    oManager["addUser"] := {|oUser| ManagerAddUser(oManager, oUser) }
    oManager["removeUser"] := {|nUserId| ManagerRemoveUser(oManager, nUserId) }
    oManager["findUserById"] := {|nUserId| ManagerFindUserById(oManager, nUserId) }
    oManager["findUserByEmail"] := {|cEmail| ManagerFindUserByEmail(oManager, cEmail) }
    oManager["getAllUsers"] := {|| ManagerGetAllUsers(oManager) }
    oManager["getActiveUsers"] := {|| ManagerGetActiveUsers(oManager) }
    oManager["getUsersByRole"] := {|cRole| ManagerGetUsersByRole(oManager, cRole) }
    oManager["getUserCount"] := {|| ManagerGetUserCount(oManager) }
    oManager["printUserReport"] := {|| ManagerPrintUserReport(oManager) }
    
    Return oManager
Return Nil

// UserManager methods implementations
Static Function ManagerAddUser(oManager, oUser)
    // Basic validation (obviously not as robust as instanceof in JS)
    If ValType(oUser) != "O" .OR. !("name" $ oUser)
        UserException("Invalid user object")
        Return .F.
    EndIf
    
    // Check if user with same email already exists
    If ManagerFindUserByEmail(oManager, oUser["email"]) != Nil
        ConOut("User with email " + oUser["email"] + " already exists")
        Return .F.
    EndIf
    
    aAdd(oManager["users"], oUser)
    ConOut("Added user: " + oUser["name"])
    Return .T.
Return Nil

Static Function ManagerRemoveUser(oManager, nUserId)
    Local nIndex := 0
    Local oRemoved := Nil
    
    // Find the user by ID
    For nIndex := 1 To Len(oManager["users"])
        If oManager["users"][nIndex]["id"] == nUserId
            oRemoved := oManager["users"][nIndex]
            aDel(oManager["users"], nIndex)
            aSize(oManager["users"], Len(oManager["users"]) - 1)
            aAdd(oManager["deletedUsers"], oRemoved)
            ConOut("Removed user: " + oRemoved["name"])
            Return .T.
        EndIf
    Next
    
    ConOut("User with ID " + cValToChar(nUserId) + " not found")
    Return .F.
Return Nil

Static Function ManagerFindUserById(oManager, nUserId)
    Local nIndex := 0
    
    For nIndex := 1 To Len(oManager["users"])
        If oManager["users"][nIndex]["id"] == nUserId
            Return oManager["users"][nIndex]
        EndIf
    Next
    
    Return Nil
Return Nil

Static Function ManagerFindUserByEmail(oManager, cEmail)
    Local nIndex := 0
    
    For nIndex := 1 To Len(oManager["users"])
        If oManager["users"][nIndex]["email"] == cEmail
            Return oManager["users"][nIndex]
        EndIf
    Next
    
    Return Nil
Return Nil

Static Function ManagerGetAllUsers(oManager)
    Return oManager["users"]
Return Nil

Static Function ManagerGetActiveUsers(oManager)
    Local aActiveUsers := {}
    Local nIndex := 0
    
    For nIndex := 1 To Len(oManager["users"])
        If oManager["users"][nIndex]["active"] == .T.
            aAdd(aActiveUsers, oManager["users"][nIndex])
        EndIf
    Next
    
    Return aActiveUsers
Return Nil

Static Function ManagerGetUsersByRole(oManager, cRole)
    Local aRoleUsers := {}
    Local nIndex := 0
    
    For nIndex := 1 To Len(oManager["users"])
        If oManager["users"][nIndex]["role"] == cRole
            aAdd(aRoleUsers, oManager["users"][nIndex])
        EndIf
    Next
    
    Return aRoleUsers
Return Nil

Static Function ManagerGetUserCount(oManager)
    Return Len(oManager["users"])
Return Nil

Static Function ManagerPrintUserReport(oManager)
    Local nIndex := 0
    Local aActiveUsers := ManagerGetActiveUsers(oManager)
    Local aAdmins := ManagerGetUsersByRole(oManager, "admin")
    
    ConOut("===== USER REPORT =====")
    ConOut("Total users: " + cValToChar(ManagerGetUserCount(oManager)))
    ConOut("Active users: " + cValToChar(Len(aActiveUsers)))
    ConOut("Admin users: " + cValToChar(Len(aAdmins)))
    
    ConOut(Chr(10) + "User List:")
    For nIndex := 1 To Len(oManager["users"])
        ConOut(cValToChar(nIndex) + ". " + ;
               oManager["users"][nIndex]["name"] + " (" + ;
               oManager["users"][nIndex]["email"] + ") - " + ;
               oManager["users"][nIndex]["role"] + " - " + ;
               IIF(oManager["users"][nIndex]["active"], "Active", "Inactive"))
    Next
    
    ConOut("=======================")
Return Nil

// Exception handling in ADVPL
Static Function UserException(cMessage)
    ConOut("Error: " + cMessage)
    // In a real application we'd use ADVPL error handling:
    // UserException(cMessage)
Return Nil

// Example usage
User Function InitializeUserSystem()
    // Create a user manager
    Local oUserManager := UserManager()
    
    // Add some users
    Local oJohn := User(1, "John Doe", "john@example.com", "admin")
    Local oJane := User(2, "Jane Smith", "jane@example.com")
    Local oBob := User(3, "Bob Johnson", "bob@example.com", "manager")
    
    Eval(oUserManager["addUser"], oJohn)
    Eval(oUserManager["addUser"], oJane)
    Eval(oUserManager["addUser"], oBob)
    
    // Simulate user actions
    Eval(oJohn["login"])
    Eval(oJane["login"])
    
    // Update a user
    Eval(oJane["updateRole"], "support")
    
    // Deactivate a user
    Eval(oBob["deactivate"])
    
    // Get user reports
    Eval(oUserManager["printUserReport"])
    
    // Find specific users
    Local oFoundUser := Eval(oUserManager["findUserByEmail"], "jane@example.com")
    If oFoundUser != Nil
        ConOut("Found user: " + oFoundUser["name"])
    EndIf
    
    // Remove a user
    Eval(oUserManager["removeUser"], 1)
    
    // Print final report
    Eval(oUserManager["printUserReport"])
    
    Return oUserManager
Return Nil 