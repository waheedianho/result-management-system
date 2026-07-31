$(document).ready(function () {
  const s2 = document.querySelector("#sname");
    const subjectsHolder = document.querySelector("#subjects");//select element to populate
    const resultHolder = document.querySelector("#result")
  // const arr = [1, 2, 3, 4, 5];

    const studentSubjectsResult = function (subject, subjectComboId) {
        const div = document.createElement('div');
        div.className = 'form-row m-3';
        div.innerHTML = `
            <div class="col-2">
                <p>${subject}: </p>
            </div>
            <div class="col-9">
                <div class="row">
<!--                    <label for="score" class="col-4 text-center">Exam Score: </label>-->

                     <div class="col-6">
                        <input type="text" placeholder="CA" class='form-control' name='ca' id="${subjectComboId}_ca">
                    </div>
                    <div class="col-6">
                        <input type="number" placeholder="Exam" class='form-control' name='exam' id="${subjectComboId}_exam">
                    </div>
                </div>
            </div>
            <div class="col-1" onclick="this.parentElement.remove()" >
                <button type="button" class="btn btn-danger w-100" >
                    <i class="fa fa-trash"></i>
                </button>
            </div>`;

        return div;
    }

  $("#sclass").change(async function () {
    s2.innerHTML = `<option>Select student</option>`;
    

      const cname = this.value;
      try {
          const response = await fetch(`/students/${cname}`);
          const subjectsResponse = await fetch(`/admin/subject-combination/${cname}`);
          // const results = await response.json();
          const docs = await response.json();
          const subjects = await subjectsResponse.json();
          console.log(docs);
          console.log(subjects, cname);


          for (el in docs) {
              console.log(el);
              const option = document.createElement("option");
              option.innerHTML = docs[el].fname;
              option.value = docs[el]._id;
              s2.options.add(option);
          }

          if (window.snameChoices) {
              window.snameChoices.destroy();
          }
          window.snameChoices = new Choices('#sname', {
              searchEnabled: true,
              itemSelectText: '',
              shouldSort: false
          });

          // resultHolder.innerHTML = '';
          // for (let classRegSub of subjects) {
          //     console.log(classRegSub.subject);
          //     const formField = studentSubjectsResult(classRegSub.subject, classRegSub._id);
          //     resultHolder.appendChild(formField);
          // }


      } catch (err) {
          console.log(err);
      }
    
    
  });

    $("#sname").change(async function () {

        const studentId = this.value;
        const classId = $('#sclass').val();

        const session = $('#global_session').val();
        const term = $('#global_term').val();

        try {
            const subjectsResponse = await fetch(`/admin/subject-combination/${classId}`);
            const resultResponse = await fetch(`/admin/results?sclass=${classId}&student=${studentId}&session=${encodeURIComponent(session)}&term=${encodeURIComponent(term)}`);

            const subjects = await subjectsResponse.json();
            const results = await resultResponse.json();
            console.log(subjects, classId);

            const stuSubjects = results?.map(res => String(res?.subject?._id));
            console.log("Recorded subject combinations:", stuSubjects);

            resultHolder.innerHTML = '';
            for (let classRegSub of subjects) {
                console.log("Checking combination:", classRegSub.subject);
                if(!stuSubjects.includes(String(classRegSub._id))) {
                    const formField = studentSubjectsResult(classRegSub.subject?.sname, classRegSub._id);
                    resultHolder.appendChild(formField);
                }
            }

        } catch (err) {
            console.log(err);
        }


    });

    $('#global_session, #global_term').change(function() {
        if ($('#sname').val()) {
            $('#sname').trigger('change');
        }
    });

    $('#sclass_cb').change(function () {
        const classId = this.value;
        fetch(`/admin/subject-combination/${classId}`)
            .then((data) => data.json())
            .then((docs) => {
                const subRegister = new Set(docs.map((el) => el.subject));
                const options = Array.from(subjectsHolder.options);

                subjectsHolder.innerHTML = '';
                options.forEach((el) => {
                    if (!subRegister.has(el.value)) {
                        subjectsHolder.append(el)
                    }
                });

                choicesInstance?.destroy();
                choicesInstance = new Choices('#subjects', {
                    removeItemButton: true,
                    searchEnabled: true
                });
            })
            .catch((err) => console.log(err));
    })



});



// const fruitBasket = {
//   apple: 27,
//   grape: 0,
//   pear: 14,
// };

// const rest = () => {
//   return new Promise((resolve) => {
//     setTimeout(resolve, 1000);
//   });
// };

// const getFruitNum = (fruit) => {
//   return rest().then((v) => fruitBasket[fruit]);
// };

// getFruitNum("apple").then((num) => console.log(num))

// const control = async () => {
//   const numsApple = await getFruitNum("apple");
//   console.log(numsApple);
//   const numsGrape = await getFruitNum("grape");
//   console.log(numsGrape);
//   const numPear = await getFruitNum("pear");
//   console.log(numPear);
// };

// //dealing with array

// const fruitToGet = ['apple', 'grape', 'pear']

// const forLoop = async () => {
//   console.log('start')

//   fruitToGet.forEach(async (element) => {
//     const numFruit = await getFruitNum(element)
//     console.log(numFruit)
//   })

//   console.log('end')
// }
