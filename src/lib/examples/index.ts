// Example code exports
export const complexJsExample = `
function processUserData(users) {
  const activeUsers = [];
  const nameLengths = [];

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    if (user.isActive === true && user.age > 18) {
      let fullName = user.firstName + ' ' + user.lastName;
      console.log('Processing user: ' + fullName);
      activeUsers.push(fullName.toUpperCase());
      nameLengths.push(fullName.length);
    } else if (user.age <= 18) {
      console.log('Skipping minor user: ' + user.firstName);
    }
  }

  let totalLength = 0;
  let idx = 0;
  while(idx < nameLengths.length) {
    totalLength += nameLengths[idx];
    idx++;
  }
  const averageLength = nameLengths.length > 0 ? totalLength / nameLengths.length : 0;

  console.log("Active users:", activeUsers);
  console.log("Average name length:", averageLength);

  return { activeCount: activeUsers.length, avgLength: averageLength };
}

const sampleUsers = [
  { firstName: 'John', lastName: 'Doe', age: 30, isActive: true },
  { firstName: 'Jane', lastName: 'Smith', age: 17, isActive: true },
  { firstName: 'Peter', lastName: 'Jones', age: 45, isActive: false },
  { firstName: 'Mary', lastName: 'Brown', age: 25, isActive: true },
];

processUserData(sampleUsers);
`;

export const complexAdvplExample = `
#Include "Protheus.ch"

// Exemplo de função ADVPL simulando processamento de dados
User Function ProcessUserData(aUsers)
  Local aActiveUsers := {}
  Local aNameLengths := {}
  Local cFullName := ""
  Local nTotalLength := 0
  Local nAverageLength := 0
  Local nIdx := 0
  Local oUser
  Local lIsActive := .F.
  Local nAge := 0

  For nIdx := 1 To Len(aUsers)
    oUser := aUsers[nIdx] // AdvPL usually uses objects or arrays for structures

    // Assuming oUser is an array: [1]=isActive, [2]=Age, [3]=FirstName, [4]=LastName
    lIsActive := oUser[1]
    nAge := oUser[2]

    If lIsActive == .T. .And. nAge > 18
      cFullName := AllTrim(oUser[3]) + " " + AllTrim(oUser[4])
      ConOut("Processando usuario: " + cFullName)
      aAdd(aActiveUsers, Upper(cFullName))
      aAdd(aNameLengths, Len(cFullName))
    ElseIf nAge <= 18
       ConOut("Pulando usuario menor: " + AllTrim(oUser[3]))
    EndIf
  Next nIdx

  nIdx := 1
  While nIdx <= Len(aNameLengths)
    nTotalLength += aNameLengths[nIdx]
    nIdx++
  EndDo

  If Len(aNameLengths) > 0
     nAverageLength := nTotalLength / Len(aNameLengths)
  Else
     nAverageLength := 0
  EndIf

  ConOut("Usuarios ativos: " + Implode(",", aActiveUsers)) // Implode requires custom function or adaptation
  ConOut("Tamanho medio nome: " + Str(nAverageLength))

  Return { "activeCount" => Len(aActiveUsers), "avgLength" => nAverageLength } // Returning an object/map

// Exemplo de chamada (estrutura de dados simplificada)
Local aSampleUsers := {
  { .T., 30, "John",  "Doe"   },
  { .T., 17, "Jane",  "Smith" },
  { .F., 45, "Peter", "Jones" },
  { .T., 25, "Mary",  "Brown" }
}

ProcessUserData(aSampleUsers)

Return Nil
`; 