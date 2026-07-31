$(document).ready(() => {
  //Delete COmfirmation
  btnDelete = $('.btn-delete');
  isSetDelete = $('#comfirmDelete');

  $(document).on('click', '.btn-delete', function () {
    if (url != '/admin/manage-result') {
      currentRow = $(this).parents('tr');
      isSetDelete.click(() => {
        $.ajax({
          type: 'Delete',
          url: url + '/' + this.id,
          data: null,
          dataType: 'json',
          success: resp => {
            currentRow.fadeOut(1000);
            location.reload();
          },
          error: function (err) {
            console.log(err);
          },
        });
      });
    } else {
      const studentName = $(this).closest('tr').find('td:nth-child(3) strong').text() || 'Student Results';
      $('#student_name').text(studentName);
      $('#prompt tbody').html('<tr><td colspan="7" class="text-center py-4 text-muted"><i class="fa fa-spinner fa-spin mr-2"></i>Loading results...</td></tr>');

      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set('student', this.id);
      
      fetch(`/admin/results?${urlParams.toString()}`)
        .then(data => data.json())
        .then(resp => {
          const selectStudent = resp || [];
          table = $('#prompt tbody');

          if (selectStudent && selectStudent.length > 0 && selectStudent[0]?.student?.fname) {
            $('#student_name').text(selectStudent[0].student.fname);
          }

          if (selectStudent.length === 0) {
            table.html('<tr><td colspan="7" class="text-center py-4 text-muted">No results found for this student.</td></tr>');
            return;
          }

          template = selectStudent.map((result, i) => {
            const subjName = result?.subject?.subject?.sname || result?.subject?.sname || result?.subjectName || '';
            return $(` 
                  <tr>
                        <td>
                          ${i + 1}
                        </td>
                        <td>
                          ${subjName}
                        </td>
                        <td>
                            <input
                            type="number"
                            name="ca_score"
                            value="${result?.ca_score ?? ''}"
                            class="form-control bg-transparent border-0 unclick text-center"
                            disabled
                            />
                        </td>
                         <td>
                            <input
                            type="number"
                            name="exam_score"
                            value="${result?.exam_score ?? ''}"
                            class="form-control bg-transparent border-0 unclick text-center"
                            disabled
                            />
                        </td>
                        <td>
                           ${result?.totalScore ?? ''}
                        </td>
                        <td>
                            ${result?.grade || ''}
                        </td>
                        <td class="text-center actionBtn">
                            <i class="btn btn-info fa fa-edit edit" id="${result._id}"></i>
                             <i class="btn btn-danger fa fa-trash-o comfirmDelete" id="${result._id}"></i>
                        </td>
                </tr>
              `);
          });
          table.html(template);

          studentId = this.id;
          $('.comfirmDelete').click(function () {
            resultId = this.id;
            currentRow = $(this).parents('tr');
            
            // Show the system delete modal
            $('#delete').modal('show');
            
            // Handle confirmation
            $('#comfirmDelete').off('click').on('click', function () {
              $.ajax({
                type: 'Delete',
                url: `${url}/${resultId}`,
                dataType: 'json',
                success: resp => {
                  currentRow.fadeOut(1000);
                  $('#delete').modal('hide');
                  location.reload();
                },
                error: function (err) {
                  console.log(err);
                },
              });
            });
          });
        })
        .catch(err => {
          console.error('Error fetching results:', err);
          $('#prompt tbody').html('<tr><td colspan="7" class="text-center py-4 text-danger">Failed to load results.</td></tr>');
        });
    }
  });
});
